'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { UserProfile, Match, Tournament, Sport, SkillLevel } from '@/lib/types';
import { useEffect, useState } from 'react';
import { sportNames, levelNames, roleNames, sportIcons, sportColors } from '@/lib/theme';

export function ProfileTab() {
  const { profile, user, logout, updateProfile, isModerator, isHost, isSupport } = useAuth();
  const { showToast } = useToast();
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    city: '',
    sport: '' as Sport | '',
    level: 'any' as SkillLevel,
    ntrp: '',
    bio: '',
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const matchesQ = query(
      collection(db, 'matches'),
      where('participants', 'array-contains', user.uid),
      orderBy('startDate'),
      limit(20)
    );
    const matchesUnsub = onSnapshot(matchesQ, (snap) => {
      setMyMatches(snap.docs.map(d => ({ id: d.id, ...d.data(), startDate: d.data().startDate?.toDate?.() } as Match)));
    });

    const tourneysQ = query(
      collection(db, 'tournaments'),
      where('participants', 'array-contains', user.uid),
      orderBy('startDate', 'desc'),
      limit(20)
    );
    const tourneysUnsub = onSnapshot(tourneysQ, (snap) => {
      setMyTournaments(snap.docs.map(d => ({ id: d.id, ...d.data(), startDate: d.data().startDate?.toDate?.() } as Tournament)));
    });

    if (profile) {
      setEditForm({
        displayName: profile.displayName,
        city: profile.city,
        sport: profile.sport || '',
        level: profile.level,
        ntrp: profile.ntrp?.toString() || '',
        bio: '',
      });
    }
    setLoading(false);
    return () => { matchesUnsub(); tourneysUnsub(); };
  }, [user, profile]);

  const saveProfile = async () => {
    if (!user) return;
    await updateProfile({
      displayName: editForm.displayName,
      city: editForm.city,
      sport: editForm.sport || undefined,
      level: editForm.level,
      ntrp: editForm.ntrp ? parseFloat(editForm.ntrp) : undefined,
    });
    setEditing(false);
    showToast('Профиль сохранён', 'success');
  };

  const formatDate = (date: Date) => new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(date);

  if (loading || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center pb-24">
        <div className="animate-pulse-slow text-2xl text-[var(--color-brand)]">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-2xl bg-[var(--color-brand-light)] flex items-center justify-center text-4xl text-[var(--color-brand)] font-bold">
            {profile.displayName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={editForm.displayName}
                onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] rounded px-1"
              />
            ) : (
              <h1 className="text-2xl font-bold truncate">{profile.displayName}</h1>
            )}
            <p className="text-gray-500 text-sm truncate">{profile.email || 'Email не указан'}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${isModerator ? 'bg-[var(--color-brand)] text-white' : isSupport ? 'bg-green-100 text-green-700' : isHost ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                {roleNames[profile.role] || profile.role}
              </span>
              {profile.rating > 0 && (
                <span className="flex items-center gap-1 text-yellow-600 font-semibold">
                  ⭐ {profile.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-[var(--color-brand)]">{myMatches.length}</div>
            <div className="text-xs text-gray-500">Матчей</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-[var(--color-brand)]">{myTournaments.length}</div>
            <div className="text-xs text-gray-500">Турниров</div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className={`flex-1 px-4 py-2 rounded-xl font-semibold ${editing ? 'btn-secondary' : 'btn-primary'}`}
          >
            {editing ? 'Отмена' : 'Редактировать'}
          </button>
          {editing && (
            <button onClick={saveProfile} className="btn-primary flex-1">
              Сохранить
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-lg">Редактирование профиля</h3>
          <input
            value={editForm.displayName}
            onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
            placeholder="Имя"
            className="input-field"
          />
          <input
            value={editForm.city}
            onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
            placeholder="Город"
            className="input-field"
          />
          <select
            value={editForm.sport}
            onChange={e => setEditForm(f => ({ ...f, sport: e.target.value as Sport }))}
            className="input-field"
          >
            <option value="">Спорт не выбран</option>
            {(['padel', 'tennis', 'badminton', 'squash', 'football', 'running'] as Sport[]).map(s => (
              <option key={s} value={s}>{sportNames[s]}</option>
            ))}
          </select>
          <select
            value={editForm.level}
            onChange={e => setEditForm(f => ({ ...f, level: e.target.value as SkillLevel }))}
            className="input-field"
          >
            {(['any', 'beginner', 'middle', 'advanced'] as SkillLevel[]).map(l => (
              <option key={l} value={l}>{levelNames[l]}</option>
            ))}
          </select>
          {editForm.sport === 'tennis' && (
            <input
              type="number"
              step="0.1"
              value={editForm.ntrp}
              onChange={e => setEditForm(f => ({ ...f, ntrp: e.target.value }))}
              placeholder="NTRP (например, 3.5)"
              className="input-field"
            />
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold">Мои матчи</h3>
          <span className="text-sm text-gray-500">{myMatches.length}</span>
        </div>
        {myMatches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Матчей пока нет</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {myMatches.slice(0, 5).map(m => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{sportIcons[m.sport]}</span>
                  <div>
                    <p className="font-medium">{m.venue}</p>
                    <p className="text-sm text-gray-500">{formatDate(m.startDate)}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.participants.includes(user?.uid || '') ? 'bg-green-100 text-green-700' : 'bg-[var(--color-brand)] text-white'}`}>
                  {m.participants.includes(user?.uid || '') ? 'В игре' : `${m.openSpots} мест`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold">Мои турниры</h3>
          <span className="text-sm text-gray-500">{myTournaments.length}</span>
        </div>
        {myTournaments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Турниров пока нет</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {myTournaments.slice(0, 5).map(t => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{sportIcons[t.sport]}</span>
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-sm text-gray-500">{formatDate(t.startDate)}</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {t.participants.length}/{t.maxParticipants}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <button
          onClick={() => logout()}
          className="w-full btn-danger"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}