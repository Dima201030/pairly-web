'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileDoc.exists()) {
          setProfile({ ...profileDoc.data(), uid: profileDoc.id } as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, displayName: string, sport?: string) => {
    const { createUserWithEmailAndPassword, updateProfile: updateAuthProfile } = await import('firebase/auth');
    const { Timestamp } = await import('firebase/firestore');
    
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateAuthProfile(result.user, { displayName });
    
    const newProfile: UserProfile = {
      uid: result.user.uid,
      displayName,
      email,
      city: '',
      sport: sport as any,
      level: 'any',
      rating: 5.0,
      createdAt: new Date(),
      discoveredSports: [],
      role: 'user',
      blocked: false,
    };
    
    await setDoc(doc(db, 'users', result.user.uid), {
      ...newProfile,
      createdAt: Timestamp.fromDate(newProfile.createdAt),
    });
    setProfile(newProfile);
  };

  const logout = async () => {
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const { Timestamp } = await import('firebase/firestore');
    const updated = { ...profile, ...data };
    await setDoc(doc(db, 'users', user.uid), {
      ...updated,
      createdAt: Timestamp.fromDate(updated.createdAt),
    }, { merge: true });
    setProfile(updated);
  };

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