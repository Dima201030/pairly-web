'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { sportNames, levelNames, sportIcons, sportColors } from '@/lib/theme';
import { Match, Sport, SkillLevel, UserProfile } from '@/lib/types';
import { formatDate, timeUntil } from '@/lib/format';
import { collection, query, where, orderBy, onSnapshot, Timestamp, limit, doc, runTransaction, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmptyState } from '@/components/ui/EmptyState';
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
        <div className="animate-pulse-slow brand-gradient-text text-2xl font-bold">Загрузка матчей...</div>
      </div>
    );
  }

  const joinMatch = async (match: Match, leave: boolean) => {
    if (!profile) { showToast('Войдите в аккаунт', 'error'); return; }
    const matchRef = doc(db, 'matches', match.id);

    setJoiningId(match.id);
    try {
      // Транзакция: проверка «мест нет» и повторное участие выполняются
      // атомарно с записью — исключается уход openSpots в минус (гонка
      // нескольких записей одновременно).
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
    <div className="flex-1 overflow-y-auto pb-24 pt-4 px-4 space-y-4 animate-in">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="brand-gradient-text text-3xl font-extrabold tracking-tight">Матчи</h1>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
            {filteredMatches.length === 0
              ? 'Свободных игр пока нет'
              : `${filteredMatches.length} ${filteredMatches.length === 1 ? 'открытая игра' : filteredMatches.length < 5 ? 'открытые игры' : 'открытых игр'} рядом`}
          </p>
        </div>
        {isStaff && (
          <span className="pill bg-[var(--color-brand)] text-white shadow-md">
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
        <div className="space-y-3" role="list" aria-label="Список матчей">
          {filteredMatches.map((match, index) => (
            <MatchCard
              key={match.id}
              match={match}
              profile={profile}
              index={index}
              joining={joiningId === match.id}
              onJoin={() => joinMatch(match, false)}
              onLeave={() => joinMatch(match, true)}
            />
          ))}
        </div>
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
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="group" aria-label={label}>
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
}

function MatchCard({ match, profile, index, joining, onJoin, onLeave }: MatchCardProps) {
  const isJoined = match.participants.includes(profile?.uid || '');
  const sportColor = sportColors[match.sport];
  const hasMap = match.latitude !== 0 || match.longitude !== 0;
  const spotsPct = match.totalSpots > 0
    ? Math.max(0, Math.min(100, Math.round((match.openSpots / match.totalSpots) * 100)))
    : 0;

  return (
    <article
      className={`card p-4 flex flex-col gap-4 animate-in ${isJoined ? 'border-[var(--color-brand)]/50' : 'card-interactive'}`}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
      role="listitem"
    >
      <div className="flex gap-4">
        <div className="relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border"
          style={{
            backgroundColor: `${sportColor}14`,
            borderColor: `${sportColor}40`,
            boxShadow: `0 4px 16px -6px ${sportColor}55`,
          }}>
          <span aria-hidden="true">{sportIcons[match.sport]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{match.venue}</h3>
            <span className="pill pill-inactive !py-0.5 text-xs shrink-0">
              {match.city}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-tertiary)] truncate mb-2">{match.district}</p>

          <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
            <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
              <span aria-hidden="true">📅</span>
              {formatDate(match.startDate)}
            </span>
            <span className="flex items-center gap-1 text-[var(--color-brand)] font-medium">
              <span aria-hidden="true">⏱️</span>
              {timeUntil(match.startDate)}
            </span>
            <span className="badge" style={{ backgroundColor: `${sportColor}1c`, color: sportColor }}>
              {sportNames[match.sport]}
            </span>
            <span className="badge badge-gray">
              {levelNames[match.level]}
            </span>
          </div>

          {isJoined && (
            <span className="pill brand-gradient text-xs text-[var(--color-text-on-brand)]">
              ✓ Вы записаны
            </span>
          )}

          {match.note && (
            <p className="mt-2 text-sm text-[var(--color-text-tertiary)] line-clamp-2">{match.note}</p>
          )}

          {hasMap && (
            <div className="mt-3 rounded-lg overflow-hidden border border-[var(--color-border)]">
              <iframe
                width="100%"
                height="120"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Карта: ${match.venue}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${match.longitude - 0.008}%2C${match.latitude - 0.004}%2C${match.longitude + 0.008}%2C${match.latitude + 0.004}&layer=mapnik&marker=${match.latitude}%2C${match.longitude}`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-divider)] pt-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-semibold text-[var(--color-brand-green)]">
              {match.openSpots > 0 ? `Свободно ${match.openSpots}` : 'Мест нет'}
            </span>
            <span className="text-xs text-[var(--color-text-tertiary)]">из {match.totalSpots}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden">
            <div
              className="h-full brand-gradient transition-all duration-500"
              style={{ width: `${spotsPct}%` }}
            />
          </div>
        </div>

        {isJoined ? (
          <button
            onClick={onLeave}
            disabled={joining}
            className="btn btn-outline btn-sm shrink-0"
          >
            {joining ? 'Отмена...' : 'Покинуть'}
          </button>
        ) : (
          <button
            onClick={onJoin}
            disabled={joining || match.openSpots === 0}
            className={`btn btn-sm shrink-0 ${match.openSpots > 0 ? 'btn-primary' : 'btn-outline'}`}
          >
            {joining ? 'Запись...' : match.openSpots > 0 ? 'Записаться' : 'Мест нет'}
          </button>
        )}
      </div>
    </article>
  );
}