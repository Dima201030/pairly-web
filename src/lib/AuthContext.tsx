'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserProfile, Sport } from '@/lib/types';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isHost: boolean;
  isModerator: boolean;
  isSupport: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, sport?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  restoreProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const profileUnsubRef = useRef<(() => void) | null>(null);

  // Восстановление старых аккаунтов, у которых профиль так и не создался
  // (до исправления register отправлял role, и правила отклоняли create).
  // Создаём минимальный док БЕЗ role/blocked — правила это разрешают.
  const createMissingProfile = useCallback(async (fuser: FirebaseUser) => {
    const { Timestamp, getDoc } = await import('firebase/firestore');
    const deletedRef = doc(db, 'deleted_users', fuser.uid);
    const deletedSnap = await getDoc(deletedRef);
    if (deletedSnap.exists()) {
      console.warn('[AuthContext] user', fuser.uid, 'is deleted — skipping profile creation');
      return;
    }
    const name = fuser.displayName || (fuser.email ? fuser.email.split('@')[0] : 'Пользователь');
    try {
      setProfile({
        uid: fuser.uid,
        displayName: name,
        email: fuser.email ?? '',
        city: '',
        sport: undefined,
        level: 'any',
        rating: 5.0,
        createdAt: new Date(),
        discoveredSports: [],
        role: 'user',
        blocked: false,
      } as UserProfile);
      await setDoc(doc(db, 'users', fuser.uid), {
        uid: fuser.uid,
        displayName: name,
        email: fuser.email ?? '',
        city: '',
        level: 'any',
        rating: 5.0,
        createdAt: Timestamp.fromDate(new Date()),
        discoveredSports: [],
      }, { merge: true });
    } catch (err) {
      console.error('[AuthContext] restore profile doc failed', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      profileUnsubRef.current?.();
      profileUnsubRef.current = null;

      if (firebaseUser) {
        profileUnsubRef.current = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile({ ...snap.data(), uid: snap.id } as UserProfile);
            } else {
              setProfile(null);
              createMissingProfile(firebaseUser);
            }
          },
          () => {
            setProfile(null);
          }
        );
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      profileUnsubRef.current?.();
      profileUnsubRef.current = null;
    };
  }, [createMissingProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string, sport?: string) => {
    const { createUserWithEmailAndPassword, updateProfile: updateAuthProfile } = await import('firebase/auth');
    const { Timestamp } = await import('firebase/firestore');
    
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateAuthProfile(result.user, { displayName });

    const newProfile: UserProfile = {
      uid: result.user.uid,
      displayName,
      email,
      city: '',
      sport: sport as Sport | undefined,
      level: 'any',
      rating: 5.0,
      createdAt: new Date(),
      discoveredSports: [],
      role: 'user',
      blocked: false,
    };

    // Профиль отражаем локально сразу, чтобы не было «вечного лоадера»
    // между созданием аккаунта и подпиской onSnapshot. Если запись в БД
    // падает — аккаунт уже существует, док создастся при первом updateProfile
    // (merge), а не-существующий док подсветим состоянием !profile.
    setProfile(newProfile);
    try {
      // ВАЖНО: правила Firestore запрещают создавать профиль с полем `role`
      // (вектор само-эскалации). `role`/`blocked` — серверно-контролируемые:
      // не шлём их в док, иначе create отклоняется и регистрация «проходит»,
      // но у пользователя нет профиля → нельзя записаться ни на что (M5-аналог).
      const serverFields = new Set(['role', 'blocked']);
      const profileData = Object.fromEntries(
        Object.entries(newProfile).filter(([key, val]) => !serverFields.has(key) && val !== undefined)
      );
      await setDoc(doc(db, 'users', result.user.uid), {
        ...profileData,
        createdAt: Timestamp.fromDate(newProfile.createdAt),
      }, { merge: true });
    } catch (err) {
      // Аккаунт уже создан; док дозапишется при первом updateProfile (merge).
      // Ошибка не должна валить регистрацию — пользователь видит приложение.
      console.error('[AuthContext] profile setDoc failed for new user', err);
    }
  }, []);

  const logout = useCallback(async () => {
    // Снимаем подписку на профиль сразу, не дожидаясь onAuthStateChanged:
    // слушатель не должен жить после выхода.
    profileUnsubRef.current?.();
    profileUnsubRef.current = null;
    setProfile(null);
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    router.push('/login');
    router.refresh();
  }, [router]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const { Timestamp } = await import('firebase/firestore');
    const updated = { ...profile, ...data };
    const serverFields = new Set(['role', 'blocked']);
    const profileData = Object.fromEntries(
      Object.entries(updated).filter(([key, val]) => !serverFields.has(key) && val !== undefined)
    );
    console.log('[AuthContext] updateProfile keys:', Object.keys(profileData), 'ntrp:', profileData.ntrp, 'ntrp type:', typeof profileData.ntrp);
    const createdAt = updated.createdAt instanceof Date
      ? Timestamp.fromDate(updated.createdAt)
      : updated.createdAt;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profileData,
        createdAt,
      }, { merge: true });
      setProfile(updated);
    } catch (err) {
      console.error('[AuthContext] updateProfile failed', err);
      throw err;
    }
  }, [user, profile]);

  // Ручное восстановление профиля (кнопка на вкладке «Профиль»): повторно
  // создаёт док, если он так и не появился (старые аккаунты без профиля).
  const restoreProfile = useCallback(async () => {
    if (!user) return;
    await createMissingProfile(user);
  }, [user, createMissingProfile]);

  const isHost = profile?.role === 'host';
  const isModerator = profile?.role === 'moderator' || profile?.role === 'host';
  const isSupport = profile?.role === 'support';
  const isStaff = isModerator || isSupport;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isHost,
      isModerator,
      isSupport,
      isStaff,
      login,
      register,
      logout,
      updateProfile,
      restoreProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}