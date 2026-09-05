'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { sportNames, levelNames, sportIcons, sportColors, ntrpLevelNames } from '@/lib/theme';
import { Match, Sport, SkillLevel, NTRPLevel, UserProfile } from '@/lib/types';
import { formatDate, timeUntil } from '@/lib/format';
import { collection, query, where, orderBy, onSnapshot, Timestamp, limit, doc, runTransaction, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmptyState } from '@/components/ui/EmptyState';
import { MatchDetailPanel } from '@/components/panels/MatchDetailPanel';
import { MatchListSkeleton } from '@/components/ui/Skeleton';
import { useEffect, useState, useRef, useCallback } from 'react';

const NTRP_LEVELS: NTRPLevel[] = ['2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'];

function getLevelOptions(sport: Sport | null): (SkillLevel | NTRPLevel)[] {
  if (sport === 'tennis') {
    return ['any', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'] as (SkillLevel | NTRPLevel)[];
  }
  return ['any', 'beginner', 'middle', 'advanced'] as SkillLevel[];
}

export function MatchesTab({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { profile, isStaff } = useAuth();
  const { showToast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel | null>(null);
  const [selectedNtrp, setSelectedNtrp] = useState<NTRPLevel | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeFilter, setActiveFilter] = useState<'city' | 'sport' | 'level' | 'ntrp' | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

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
  }).filter(m => {
    if (selectedNtrp && m.sport === 'tennis') {
      return m.hostNTRP != null && Math.floor(m.hostNTRP) === Math.floor(parseFloat(selectedNtrp));
    }
    return true;
  });

  const cityOptions = cities.length > 0
    ? cities
    : ['Москва', 'СПб', 'Казань', 'Екатеринбург', 'Новосибирск'];
  const sports: Sport[] = ['padel', 'tennis', 'badminton', 'squash', 'football', 'running'];

  const activeFilterCount = [selectedCity, selectedSport, selectedLevel || selectedNtrp].filter(Boolean).length;

  const resetFilters = useCallback(() => {
    setSelectedCity(null);
    setSelectedSport(null);
    setSelectedLevel(null);
    setSelectedNtrp(null);
    setActiveFilter(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setActiveFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterOptions: Array<{ key: string; label: string }> = [
    { key: 'city', label: 'Город' },
    { key: 'sport', label: 'Спорт' },
    { key: 'level', label: 'Уровень' },
    { key: 'ntrp', label: 'NTRP' },
  ];

  const getFilterValue = (): string => {
    if (selectedCity) return selectedCity;
    if (selectedSport) return sportNames[selectedSport];
    if (selectedLevel) return levelNames[selectedLevel];
    if (selectedNtrp) return ntrpLevelNames[selectedNtrp];
    return 'Фильтры';
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-6 pt-5 px-4 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="h-7 w-24 rounded-lg animate-pulse" style={{ background: 'var(--color-surface-hover)' }} />
            <div className="h-4 w-40 rounded-lg mt-1 animate-pulse" style={{ background: 'var(--color-surface-hover)' }} />
          </div>
        </div>
        <div className="h-10 w-48 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-hover)' }} />
        <MatchListSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-6 pt-5 px-3 sm:px-4 space-y-4 animate-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Матчи</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {filteredMatches.length === 0
              ? 'Свободных игр пока нет'
              : `${filteredMatches.length} открытых игр рядом`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <span className="pill" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-text-secondary)' }}>
              Персонал
            </span>
          )}
        </div>
      </div>

      <div className="relative" ref={filterRef}>
        <button
          onClick={() => setActiveFilter(activeFilter === null ? 'city' : null)}
          className="btn btn-secondary btn-sm flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          aria-expanded={activeFilter !== null}
          aria-haspopup="true"
        >
          <span aria-hidden="true">▼</span>
          Фильтры
          <span className="ml-2 text-xs opacity-60 truncate max-w-[8rem]">
            {getFilterValue()}
          </span>
          {activeFilterCount > 0 && (
            <span className="ml-2 text-[10px] font-bold" style={{ color: 'var(--color-accent)' }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilter && (
          <div
            className="absolute top-full left-0 mt-2 w-[min(calc(100vw-2rem),20rem)] max-h-[70vh] overflow-y-auto z-50 p-3 sm:p-4 space-y-3 sm:space-y-4"
            style={{
              background: 'var(--color-surface-elevated)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-modal)',
            }}
            role="menu"
            aria-label="Фильтры"
          >
            <div className="flex flex-col gap-2 text-sm">
              {filterOptions.map(option => (
                <div
                  key={option.key}
                  onClick={() => setActiveFilter(option.key as 'city' | 'sport' | 'level' | 'ntrp')}
                  role="menuitem"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    background: activeFilter === option.key ? 'var(--color-surface-hover)' : 'transparent',
                  }}
                >
                  <span className="flex items-center gap-2">
                    {option.label}
                  </span>
                  {activeFilter === option.key && (
                    <span className="ml-auto text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                      {">>"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {activeFilter === 'city' ? (
              <div>
                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Город</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedCity(null)}
                    className={`pill text-xs ${selectedCity === null ? 'pill-active' : 'pill-inactive'}`}
                    role="menuitem"
                  >
                    Все
                  </button>
                  {cityOptions.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedCity(selectedCity === c ? null : c)}
                      className={`pill text-xs ${selectedCity === c ? 'pill-active' : 'pill-inactive'}`}
                      role="menuitem"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeFilter === 'sport' ? (
              <div>
                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Спорт</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedSport(null);
                      setSelectedLevel(null);
                      setSelectedNtrp(null);
                    }}
                    className={`pill text-xs ${selectedSport === null ? 'pill-active' : 'pill-inactive'}`}
                    role="menuitem"
                  >
                    Все
                  </button>
                  {sports.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setSelectedSport(selectedSport === s ? null : s);
                        setSelectedLevel(null);
                        setSelectedNtrp(null);
                      }}
                      className={`pill text-xs ${selectedSport === s ? 'pill-active' : 'pill-inactive'}`}
                      role="menuitem"
                    >
                      <span aria-hidden="true">{sportIcons[s]}</span>
                      {sportNames[s]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeFilter === 'level' ? (
              <div>
                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Уровень</label>
                <div className="flex flex-wrap gap-1.5">
                  {getLevelOptions(selectedSport).map(l => {
                    const levelKey = typeof l === 'number' ? String(l) : l;
                    const levelName = selectedSport === 'tennis'
                      ? ntrpLevelNames[levelKey as NTRPLevel]
                      : levelNames[l as SkillLevel];
                    return (
                      <button
                        key={levelKey}
                        onClick={() => {
                          if (selectedSport === 'tennis') {
                            setSelectedNtrp(selectedNtrp === levelKey as NTRPLevel ? null : levelKey as NTRPLevel);
                            setSelectedLevel(null);
                          } else {
                            setSelectedLevel(selectedLevel === l ? null : l as SkillLevel);
                          }
                        }}
                        className={`pill text-xs ${(selectedSport === 'tennis' ? selectedNtrp : selectedLevel) === levelKey ? 'pill-active' : 'pill-inactive'}`}
                        role="menuitem"
                      >
                        {levelName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeFilter === 'ntrp' ? (
              <div>
                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Уровень NTRP</label>
                <div className="flex flex-wrap gap-1.5">
                  {NTRP_LEVELS.map(n => (
                    <button
                      key={n}
                      onClick={() => setSelectedNtrp(selectedNtrp === n ? null : n)}
                      className={`pill text-xs ${selectedNtrp === n ? 'pill-active' : 'pill-inactive'}`}
                      role="menuitem"
                    >
                      {ntrpLevelNames[n]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="btn btn-ghost btn-sm btn-full"
                role="menuitem"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCity && (
            <span className="pill pill-active text-xs">
              {selectedCity}
              <button onClick={() => setSelectedCity(null)} aria-label="Убрать город" className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </span>
          )}
          {selectedSport && (
            <span className="pill pill-active text-xs">
              {sportNames[selectedSport]}
              <button onClick={() => { setSelectedSport(null); setSelectedLevel(null); setSelectedNtrp(null); }} aria-label="Убрать спорт" className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </span>
          )}
          {selectedNtrp && (
            <span className="pill pill-active text-xs">
              NTRP {selectedNtrp}
              <button onClick={() => setSelectedNtrp(null)} aria-label="Убрать NTRP" className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </span>
          )}
          {selectedLevel && !selectedNtrp && (
            <span className="pill pill-active text-xs">
              {levelNames[selectedLevel]}
              <button onClick={() => setSelectedLevel(null)} aria-label="Убрать уровень" className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </span>
          )}
        </div>
      )}

      {matches.length === 0 ? (
        <EmptyState
          icon=""
          title="Матчей пока нет"
          description="Создай первую заявку или подожди других игроков"
          actionLabel="Создать заявку"
          onAction={() => onNavigate?.('create')}
        />
      ) : (
        <div className="flex flex-col gap-3" role="list" aria-label="Список матчей">
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

  return (
    <article
      className={`card-interactive p-4 flex flex-col gap-3 animate-in ${isJoined ? 'border-[var(--color-accent)]/30' : ''}`}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
      role="listitem"
      onClick={onOpen}
    >
      <div className="flex gap-3">
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: `${sportColor}1F`,
            border: `1px solid ${sportColor}33`,
            color: sportColor,
          }}
        >
          {sportIcons[match.sport]}
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
          {formatDate(match.startDate)}
        </span>
        <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {timeUntil(match.startDate)}
        </span>
        <span className="badge" style={{ backgroundColor: `${sportColor}1F`, color: sportColor }}>
          {sportNames[match.sport]}
        </span>
        <span className="badge badge-gray">
          {levelNames[match.level]}
        </span>
      </div>

      {isJoined && (
        <div className="pill self-start" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-text-primary)' }}>
          ✓ Вы записаны
        </div>
      )}

      {match.note && (
        <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>{match.note}</p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-divider)]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold" style={{ color: match.openSpots > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
              {match.openSpots > 0 ? `Свободно ${match.openSpots}` : 'Мест нет'}
            </span>
            <span style={{ color: 'var(--color-text-tertiary)' }}>из {match.totalSpots}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-hover)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${match.totalSpots > 0 ? Math.max(0, Math.min(100, Math.round((match.openSpots / match.totalSpots) * 100))) : 0}%`,
                background: match.openSpots > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
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