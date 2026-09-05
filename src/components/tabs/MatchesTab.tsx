'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { sportNames, levelNames, sportIcons, sportColors } from '@/lib/theme';
import { Match, Sport, SkillLevel, UserProfile } from '@/lib/types';
import { formatDate, timeUntil } from '@/lib/format';
import { collection, query, where, orderBy, onSnapshot, Timestamp, limit, doc, runTransaction, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmptyState } from '@/components/ui/EmptyState';
import { YandexMap } from '@/components/ui/YandexMap';
import { MatchDetailPanel } from '@/components/panels/MatchDetailPanel';
import { useEffect, useState } from 'react';

export function MatchesTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { profile, isStaff } = useAuth();
  const { showToast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'cities'), orderBy('name'), limit(100)),
      (snap) => {
        const names = snap.docs.map(d => d.data().name).filter((n): n is string => Boolean(n));
        setCities(names);
      },
      () => {}
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!profile) return;

    let q = query(
      collection(db, 'matches'),
      where('startDate', '>=', Timestamp.fromDate(new Date())),
      orderBy('startDate'),
      limit(20)
    );

    if (selectedCity) q = query(q, where('city', '==', selectedCity));
    if (selectedSport) q = query(q, where('sport', '==', selectedSport));
    if (selectedLevel) q = query(q, where('level', '==', selectedLevel));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          authorId: data.authorId,
          sport: data.sport,
          city: data.city,
          venue: data.venue,
          district: data.district,
          startDate: data.startDate?.toDate?.() || new Date(data.startDate),
          level: data.level,
          openSpots: data.openSpots,
          totalSpots: data.totalSpots,
          hostName: data.hostName,
          hostRating: data.hostRating,
          hostNTRP: data.hostNTRP,
          note: data.note,
          tennisType: data.tennisType,
          ntrpRange: data.ntrpRange,
          latitude: data.latitude,
          longitude: data.longitude,
          participants: data.participants || [],
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        } as Match;
      });

      setMatches(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [selectedCity, selectedSport, selectedLevel, profile]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse-slow text-lg font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
          Загрузка матчей...
        </div>
      </div>
    );
  }

  const joinMatch = async (match: Match, leave: boolean) => {
    if (!profile) { showToast('Войдите в аккаунт', 'error'); return; }
    const matchRef = doc(db, 'matches', match.id);

    setJoiningId(match.id);
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(matchRef);
        if (!snap.exists()) throw new Error('match_not_found');

        const data = snap.data() as Partial<Match>;
        const participants = data.participants || [];
        const openSpots = data.openSpots ?? 0;
        const isJoined = participants.includes(profile.uid);

        if (leave) {
          if (!isJoined) return;
          transaction.update(matchRef, {
            participants: arrayRemove(profile.uid),
            openSpots: openSpots + 1,
          });
        } else {
          if (isJoined) throw new Error('already_joined');
          if (openSpots <= 0) throw new Error('match_full');
          transaction.update(matchRef, {
            participants: arrayUnion(profile.uid),
            openSpots: openSpots - 1,
          });
        }
      });
      showToast(leave ? 'Вы вышли из матча' : 'Вы записаны!', 'success');
    } catch {
      showToast(leave ? 'Не удалось выйти' : 'Не удалось записаться', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  const filteredMatches = matches.filter(m => {
    if (m.participants.includes(profile?.uid || '')) return true;
    return m.openSpots > 0;
  });

  const cityOptions = cities.length > 0
    ? cities
    : ['Москва', 'СПб', 'Казань', 'Екатеринбург', 'Новосибирск'];
  const sports: Sport[] = ['padel', 'tennis', 'badminton', 'squash', 'football', 'running'];
  const levels: SkillLevel[] = ['any', 'beginner', 'middle', 'advanced'];

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-6 pt-5 px-4 space-y-4 animate-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Матчи</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {filteredMatches.length === 0
              ? 'Свободных игр пока нет'
              : `${filteredMatches.length} открытых игр рядом`}
          </p>
        </div>
        {isStaff && (
          <span className="pill" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
            Персонал
          </span>
        )}
      </div>

      <FilterBar
        label="Город"
        options={[{ value: null, label: 'Все города' }, ...cityOptions.map(c => ({ value: c, label: c }))]}
        selected={selectedCity}
        onChange={setSelectedCity}
      />

      <FilterBar
        label="Спорт"
        options={sports.map(s => ({ value: s, label: `${sportIcons[s]} ${sportNames[s]}` }))}
        selected={selectedSport}
        onChange={setSelectedSport}
        renderOption={({ value, selected, onClick }) => (
          <button
            key={value as Sport}
            onClick={onClick}
            className={selected ? 'pill pill-active' : 'pill pill-inactive'}
            aria-pressed={selected}
          >
            <span aria-hidden="true">{sportIcons[value as Sport]}</span>
            {sportNames[value as Sport]}
          </button>
        )}
      />

      <FilterBar
        label="Уровень"
        options={levels.map(l => ({ value: l, label: levelNames[l] }))}
        selected={selectedLevel}
        onChange={setSelectedLevel}
      />

      {matches.length === 0 ? (
        <EmptyState
          icon="🏟️"
          title="Матчей пока нет"
          description="Создай первую заявку или подожди других игроков"
          actionLabel="Создать заявку"
          onAction={() => onNavigate?.('create')}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Список матчей">
          {filteredMatches.map((match, index) => (
            <MatchCard
              key={match.id}
              match={match}
              profile={profile}
              index={index}
              joining={joiningId === match.id}
              onJoin={() => joinMatch(match, false)}
              onLeave={() => joinMatch(match, true)}
              onOpen={() => setSelectedMatch(match)}
            />
          ))}
        </div>
      )}

      {selectedMatch && (
        <MatchDetailPanel
          matchId={selectedMatch.id}
          initial={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

interface FilterBarProps<T extends string | null> {
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onChange: (value: T) => void;
  renderOption?: ({ value, selected, onClick }: { value: T; selected: boolean; onClick: () => void }) => React.ReactNode;
}

function FilterBar<T extends string | null>({ label, options, selected, onChange, renderOption }: FilterBarProps<T>) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label={label}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        const handleClick = () => onChange(isSelected ? null as T : opt.value);

        if (renderOption) {
          return renderOption({ value: opt.value, selected: isSelected, onClick: handleClick });
        }

        return (
          <button
            key={String(opt.value)}
            onClick={handleClick}
            className={isSelected ? 'pill pill-active' : 'pill pill-inactive'}
            aria-pressed={isSelected}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface MatchCardProps {
  match: Match;
  profile: UserProfile | null;
  index: number;
  joining: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onOpen: () => void;
}

function MatchCard({ match, profile, index, joining, onJoin, onLeave, onOpen }: MatchCardProps) {
  const isJoined = match.participants.includes(profile?.uid || '');
  const sportColor = sportColors[match.sport];
  const hasMap = match.latitude !== 0 || match.longitude !== 0;

  return (
    <article
      className={`card-interactive p-4 flex flex-col gap-3 animate-in ${isJoined ? 'border-[var(--color-accent)]/30' : ''}`}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
      role="listitem"
      onClick={onOpen}
    >
      <div className="flex gap-3">
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl"
          style={{
            backgroundColor: `${sportColor}18`,
            border: `1px solid ${sportColor}30`,
          }}
        >
          <span aria-hidden="true">{sportIcons[match.sport]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
              {match.venue}
            </h3>
            <span className="pill pill-inactive !py-0.5 !text-[10px] shrink-0">
              {match.city}
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>{match.district}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
          <span aria-hidden="true">📅</span>
          {formatDate(match.startDate)}
        </span>
        <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>
          <span aria-hidden="true">⏱️</span>{' '}
          {timeUntil(match.startDate)}
        </span>
        <span className="badge" style={{ backgroundColor: `${sportColor}18`, color: sportColor }}>
          {sportNames[match.sport]}
        </span>
        <span className="badge badge-gray">
          {levelNames[match.level]}
        </span>
      </div>

      {isJoined && (
        <div className="pill self-start" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
          ✓ Вы записаны
        </div>
      )}

      {match.note && (
        <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>{match.note}</p>
      )}

      {hasMap && (
        <div className="rounded-xl overflow-hidden">
          <YandexMap lat={match.latitude} lng={match.longitude} height={100} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-divider)]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold" style={{ color: match.openSpots > 0 ? 'var(--color-positive)' : 'var(--color-text-tertiary)' }}>
              {match.openSpots > 0 ? `Свободно ${match.openSpots}` : 'Мест нет'}
            </span>
            <span style={{ color: 'var(--color-text-tertiary)' }}>из {match.totalSpots}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-hover)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${match.totalSpots > 0 ? Math.max(0, Math.min(100, Math.round((match.openSpots / match.totalSpots) * 100))) : 0}%`,
                background: match.openSpots > 0 ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              }}
            />
          </div>
        </div>

        {isJoined ? (
          <button
            onClick={(e) => { e.stopPropagation(); onLeave(); }}
            disabled={joining}
            className="btn btn-outline btn-sm shrink-0"
          >
            {joining ? '...' : 'Выйти'}
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onJoin(); }}
            disabled={joining || match.openSpots === 0}
            className={`btn btn-sm shrink-0 ${match.openSpots > 0 ? 'btn-primary' : 'btn-outline'}`}
          >
            {joining ? '...' : match.openSpots > 0 ? 'Записаться' : 'Мест нет'}
          </button>
        )}
      </div>
    </article>
  );
}
