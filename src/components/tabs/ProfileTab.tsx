'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Match, Tournament, Sport, SkillLevel } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { useEffect, useState } from 'react';
import { sportNames, levelNames, roleNames, sportColors } from '@/lib/theme';
import { SupportChatPanel } from '@/components/panels/SupportChatPanel';
import { ProfileSkeleton } from '@/components/ui/Skeleton';

export function ProfileTab() {
  const { profile, user, logout, updateProfile, restoreProfile } = useAuth();
  const { showToast } = useToast();
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    city: '',
    sport: '' as Sport | '',
    level: 'any' as SkillLevel,
    ntrp: '',
  });

  useEffect(() => {
    if (!user) return;

    const matchesQ = query(
      collection(db, 'matches'),
      where('participants', 'array-contains', user.uid),
      orderBy('startDate'),
      limit(20)
    );
    const matchesUnsub = onSnapshot(matchesQ, (snap) => {
      setMyMatches(snap.docs.map(d => ({ id: d.id, ...d.data(), startDate: d.data().startDate?.toDate?.() } as Match)));
      setLoading(false);
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

    return () => { matchesUnsub(); tourneysUnsub(); };
  }, [user, profile]);

  const saveProfile = async () => {
    if (!user) return;
    try {
      await updateProfile({
        displayName: editForm.displayName,
        city: editForm.city,
        sport: editForm.sport || undefined,
        level: editForm.level,
        ntrp: editForm.ntrp ? parseFloat(editForm.ntrp) : undefined,
      });
      setEditing(false);
      showToast('Профиль сохранён', 'success');
    } catch (err) {
      console.error('[ProfileTab] saveProfile failed', err);
      showToast('Ошибка сохранения: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'), 'error');
    }
  };

  const toggleEdit = () => {
    if (!editing && profile) {
      setEditForm({
        displayName: profile.displayName,
        city: profile.city,
        sport: profile.sport || '',
        level: profile.level,
        ntrp: profile.ntrp?.toString() || '',
      });
    }
    setEditing(!editing);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'moderator': return 'badge-blue';
      case 'support': return 'badge-green';
      case 'host': return 'badge-yellow';
      default: return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-10 px-4 pt-4 max-w-3xl mx-auto">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pb-24 md:pb-10 px-4">
        <div className="text-center animate-in">
          <p className="text-lg font-medium text-[var(--color-text-secondary)]">Профиль не найден</p>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1 max-w-xs">
            Аккаунт создан, но документ профиля в базе ещё не появился. Нажмите кнопку ниже,
            чтобы создать его автоматически.
          </p>
          <button
            onClick={async () => {
              setRestoring(true);
              await restoreProfile();
              setRestoring(false);
              showToast('Профиль восстановлен', 'success');
            }}
            disabled={restoring}
            className="btn btn-primary press-scale mt-6"
          >
            {restoring ? 'Восстанавливаем...' : 'Восстановить профиль'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-10 px-3 sm:px-4 pt-4 space-y-5 animate-in max-w-3xl mx-auto">
      <div className="card p-5 relative overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-2xl sm:text-4xl font-bold shrink-0" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
            {profile.displayName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={editForm.displayName}
                onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] rounded px-1 text-[var(--color-text-primary)]"
              />
            ) : (
              <h1 className="text-2xl font-bold truncate">{profile.displayName}</h1>
            )}
            <p className="text-[var(--color-text-tertiary)] text-sm truncate">{profile.email || 'Email не указан'}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`badge ${getRoleBadge(profile.role)}`}>
                {roleNames[profile.role] || profile.role}
              </span>
              {profile.rating > 0 && (
                <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--color-highlight)' }}>
                  {profile.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2 sm:gap-3">
          <StatCard value={myMatches.length} label="Матчей" />
          <StatCard value={myTournaments.length} label="Турниров" />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={toggleEdit}
            className={`btn flex-1 ${editing ? 'btn-secondary' : 'btn-primary'}`}
          >
            {editing ? 'Отмена' : 'Редактировать'}
          </button>
          {editing && (
            <button onClick={saveProfile} className="btn btn-primary flex-1">
              Сохранить
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="card p-5 space-y-4 animate-in">
          <h3 className="font-semibold text-lg">Редактирование профиля</h3>
          <div>
            <label className="label">Имя</label>
            <input
              value={editForm.displayName}
              onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Имя"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Город</label>
            <input
              value={editForm.city}
              onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Город"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Спорт</label>
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
          </div>
          <div>
            <label className="label">Уровень</label>
            <select
              value={editForm.level}
              onChange={e => setEditForm(f => ({ ...f, level: e.target.value as SkillLevel }))}
              className="input-field"
            >
              {(['any', 'beginner', 'middle', 'advanced'] as SkillLevel[]).map(l => (
                <option key={l} value={l}>{levelNames[l]}</option>
              ))}
            </select>
          </div>
          {editForm.sport === 'tennis' && (
            <div>
              <label className="label">NTRP</label>
              <input
                type="number"
                step="0.1"
                value={editForm.ntrp}
                onChange={e => setEditForm(f => ({ ...f, ntrp: e.target.value }))}
                placeholder="NTRP (например, 3.5)"
                className="input-field"
              />
            </div>
          )}
        </div>
      )}

      <ActivitySection
        title="Мои матчи"
        count={myMatches.length}
        items={myMatches.slice(0, 5)}
        renderItem={m => (
          <ActivityItem
            title={m.venue}
            subtitle={formatDate(m.startDate)}
            badge={
              m.participants.includes(user?.uid || '')
                ? <span className="badge badge-green">В игре</span>
                : <span className="badge" style={{ backgroundColor: `${sportColors[m.sport]}20`, color: sportColors[m.sport] }}>{m.openSpots} мест</span>
            }
          />
        )}
        emptyMessage="Матчей пока нет"
      />

      <ActivitySection
        title="Мои турниры"
        count={myTournaments.length}
        items={myTournaments.slice(0, 5)}
        renderItem={t => (
          <ActivityItem
            title={t.title}
            subtitle={formatDate(t.startDate)}
            badge={<span className="badge badge-gray">{t.participants.length}/{t.maxParticipants}</span>}
          />
        )}
        emptyMessage="Турниров пока нет"
      />

      <div className="card p-4 space-y-2">
        <button
          onClick={() => setShowSupport(true)}
          className="btn btn-outline btn-full"
        >
          Связаться с поддержкой
        </button>
        <button
          onClick={() => logout()}
          className="btn btn-danger btn-full"
        >
          Выйти из аккаунта
        </button>
      </div>

      {showSupport && (
        <SupportChatPanel mode="user" onClose={() => setShowSupport(false)} />
      )}
    </div>
  );
}

interface StatCardProps {
  value: number;
  label: string;
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="card p-4 text-center">
      <div className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
      <div className="text-xs text-[var(--color-text-tertiary)]">{label}</div>
    </div>
  );
}

interface ActivitySectionProps<T> {
  title: string;
  count: number;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage: string;
}

function ActivitySection<T>({ title, count, items, renderItem, emptyMessage }: ActivitySectionProps<T>) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-divider)] flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} aria-hidden="true" />
          {title}
        </h3>
        <span className="badge" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' }}>{count}</span>
      </div>
      {items.length === 0 ? (
        <div className="p-8 text-center text-[var(--color-text-tertiary)]">{emptyMessage}</div>
      ) : (
        <div className="divide-y divide-[var(--color-divider)]">
          {items.map((item, idx) => (
            <div key={idx} className="px-4 py-3 flex items-center justify-between">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ActivityItemProps {
  title: string;
  subtitle: string;
  badge: React.ReactNode;
}

function ActivityItem({ title, subtitle, badge }: ActivityItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="font-medium truncate">{title}</p>
        <p className="text-sm text-[var(--color-text-tertiary)]">{subtitle}</p>
      </div>
      {badge}
    </div>
  );
}
