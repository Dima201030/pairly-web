'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { colors, sportNames, levelNames, sportColors, sportIcons } from '@/lib/theme';
import { Match, Sport, SkillLevel } from '@/lib/types';
import { collection, query, where, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export function MatchesTab() {
  const { profile, isStaff } = useAuth();
  const { showToast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel | null>(null);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    
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
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 20);
      setLoading(false);
    });

    return unsubscribe;
  }, [selectedCity, selectedSport, selectedLevel, profile]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const timeUntil = (date: Date) => {
    const diff = date.getTime() - Date.now();
    if (diff <= 0) return 'Начался';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)} д ${hours % 24} ч`;
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    return `${minutes} мин`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse-slow text-2xl text-[var(--color-brand)]">Загрузка матчей...</div>
      </div>
    );
  }

  const filteredMatches = matches.filter(m => {
    if (m.participants.includes(profile?.uid || '')) return true;
    return m.openSpots > 0;
  });

  return (
    <div className="flex-1 overflow-y-auto pb-24 pt-4 px-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Матчи</h1>
        {isStaff && (
          <span className="px-2 py-1 bg-[var(--color-brand-light)] text-[var(--color-brand)] text-xs font-semibold rounded-full">
            Персонал
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="group" aria-label="Фильтры">
        <button
          onClick={() => setSelectedCity(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            !selectedCity ? 'bg-[var(--color-brand)] text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Все города
        </button>
        {['Москва', 'СПб', 'Казань', 'Екатеринбург', 'Новосибирск'].map(city => (
          <button
            key={city}
            onClick={() => setSelectedCity(selectedCity === city ? null : city)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCity === city ? 'bg-[var(--color-brand)] text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="group" aria-label="Спорт">
        {(['padel', 'tennis', 'badminton', 'squash', 'football', 'running'] as Sport[]).map(sport => (
          <button
            key={sport}
            onClick={() => setSelectedSport(selectedSport === sport ? null : sport)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedSport === sport ? 'bg-[var(--color-brand)] text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <span>{sportIcons[sport]}</span>
            <span>{sportNames[sport]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="group" aria-label="Уровень">
        {(['any', 'beginner', 'middle', 'advanced'] as SkillLevel[]).map(level => (
          <button
            key={level}
            onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedLevel === level ? 'bg-[var(--color-brand)] text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {levelNames[level]}
          </button>
        ))}
      </div>

      {matches.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-gray-500">
          <div className="text-4xl mb-3">🏟️</div>
          <p className="text-lg font-medium">Матчей пока нет</p>
          <p className="text-sm mt-1">Создай первую заявку или подожди других игроков</p>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Список матчей">
          {filteredMatches.map(match => (
            <article
              key={match.id}
              className="card p-4 flex flex-col sm:flex-row gap-4"
              role="listitem"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${sportColors[match.sport]}20` }}>
                <span aria-hidden="true">{sportIcons[match.sport]}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-lg truncate">{match.venue}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {match.city}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate mb-2">{match.district}</p>
                
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-gray-600">
                    <span aria-hidden="true">📅</span>
                    {formatDate(match.startDate)}
                  </span>
                  <span className="flex items-center gap-1 text-[var(--color-brand)] font-medium">
                    <span aria-hidden="true">⏱️</span>
                    {timeUntil(match.startDate)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium`}
                    style={{ backgroundColor: `${sportColors[match.sport]}20`, color: sportColors[match.sport] }}>
                    {sportNames[match.sport]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {levelNames[match.level]}
                  </span>
                </div>
                
                {match.note && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">{match.note}</p>
                )}

                {(match.latitude !== 0 || match.longitude !== 0) && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-100">
                    <iframe
                      width="100%"
                      height="120"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${match.longitude - 0.008}%2C${match.latitude - 0.004}%2C${match.longitude + 0.008}%2C${match.latitude + 0.004}&layer=mapnik&marker=${match.latitude}%2C${match.longitude}`}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 flex flex-col items-end gap-2 sm:w-40">
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{match.openSpots}</div>
                  <div className="text-xs text-gray-500">из {match.totalSpots} мест</div>
                </div>
                <button
                  className={`w-full px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    match.participants.includes(profile?.uid || '') 
                      ? 'bg-gray-100 text-gray-600' 
                      : match.openSpots > 0 
                        ? 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={match.openSpots === 0 || match.participants.includes(profile?.uid || '')}
                >
                  {match.participants.includes(profile?.uid || '') ? 'Вы в игре' : 
                   match.openSpots > 0 ? 'Записаться' : 'Мест нет'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}