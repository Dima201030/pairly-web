'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { colors, sportNames, levelNames, sportColors, sportIcons, tournamentStatusNames } from '@/lib/theme';
import { Tournament, Sport, SkillLevel, NTRPRange } from '@/lib/types';
import { collection, query, where, orderBy, onSnapshot, Timestamp, addDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export function TournamentsTab() {
  const { profile, isStaff } = useAuth();
  const { showToast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    sport: 'padel' as Sport,
    city: '',
    venue: '',
    district: '',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    regDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    level: 'middle' as SkillLevel,
    ntrpRange: null as NTRPRange | null,
    maxParticipants: 16,
    note: '',
  });

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    
    const q = query(
      collection(db, 'tournaments'),
      orderBy('startDate', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate?.() || new Date(data.startDate),
          registrationDeadline: data.registrationDeadline?.toDate?.(),
        } as Tournament;
      });
      
      setTournaments(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile]);

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title || !form.city || !form.venue) {
      showToast('Заполните обязательные поля', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'tournaments'), {
        title: form.title.trim(),
        sport: form.sport,
        city: form.city.trim(),
        venue: form.venue.trim(),
        district: form.district.trim(),
        startDate: Timestamp.fromDate(form.startDate),
        registrationDeadline: Timestamp.fromDate(form.regDeadline),
        level: form.level,
        ntrpRange: form.ntrpRange,
        maxParticipants: form.maxParticipants,
        participants: [profile.uid],
        organizerID: profile.uid,
        organizerName: profile.displayName,
        note: form.note.trim(),
        status: 'open',
        createdAt: Timestamp.now(),
      });
      
      showToast('Турнир создан!', 'success');
      setShowCreate(false);
      setForm({
        title: '', sport: 'padel', city: '', venue: '', district: '',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        regDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        level: 'middle', ntrpRange: null, maxParticipants: 16, note: '',
      });
    } catch (error) {
      showToast('Ошибка при создании', 'error');
    }
  };

  const formatDate = (date: Date) => new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(date);

  const statusColors: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    finished: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse-slow text-2xl text-[var(--color-brand)]">Загрузка турниров...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 pt-4 px-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Турниры</h1>
        {isStaff && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            + Создать турнир
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Новый турнир</h2>
            <form onSubmit={createTournament} className="space-y-4">
              <input
                type="text"
                placeholder="Название турнира *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field"
                required
              />
              <select
                value={form.sport}
                onChange={e => setForm(f => ({ ...f, sport: e.target.value as Sport }))}
                className="input-field"
              >
                {(['padel', 'tennis', 'badminton', 'squash', 'football', 'running'] as Sport[]).map(s => (
                  <option key={s} value={s}>{sportNames[s]}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Город *"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="input-field"
                required
              />
              <input
                type="text"
                placeholder="Клуб *"
                value={form.venue}
                onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                className="input-field"
                required
              />
              <input
                type="text"
                placeholder="Район"
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                className="input-field"
              />
              <input
                type="datetime-local"
                value={form.startDate.toISOString().slice(0, 16)}
                onChange={e => setForm(f => ({ ...f, startDate: new Date(e.target.value) }))}
                className="input-field"
              />
              <input
                type="datetime-local"
                value={form.regDeadline.toISOString().slice(0, 16)}
                onChange={e => setForm(f => ({ ...f, regDeadline: new Date(e.target.value) }))}
                className="input-field"
              />
              <select
                value={form.level}
                onChange={e => setForm(f => ({ ...f, level: e.target.value as SkillLevel }))}
                className="input-field"
              >
                {(['any', 'beginner', 'middle', 'advanced'] as SkillLevel[]).map(l => (
                  <option key={l} value={l}>{levelNames[l]}</option>
                ))}
              </select>
              <input
                type="number"
                min="4"
                max="128"
                placeholder="Макс. участников"
                value={form.maxParticipants}
                onChange={e => setForm(f => ({ ...f, maxParticipants: parseInt(e.target.value) || 16 }))}
                className="input-field"
              />
              <textarea
                placeholder="Описание"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                rows={2}
                className="input-field"
              />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  Отмена
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-gray-500">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-lg font-medium">Турниров пока нет</p>
          {isStaff && <p className="text-sm mt-1">Создай первый турнир!</p>}
        </div>
      ) : (
        <div className="space-y-3" role="list">
          {tournaments.map(t => (
            <article key={t.id} className="card p-4" role="listitem">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-lg truncate">{t.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === 'open' ? 'bg-green-100 text-green-700' : t.status === 'finished' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                      {tournamentStatusNames[t.status] || t.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{t.venue}, {t.city} · {t.district}</p>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true">{sportIcons[t.sport]}</span>
                      {sportNames[t.sport]}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {levelNames[t.level]}
                    </span>
                    <span className="text-gray-600 flex items-center gap-1">
                      <span aria-hidden="true">👥</span>
                      {t.participants.length}/{t.maxParticipants}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true">📅</span>
                      {formatDate(t.startDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true">⏰</span>
                      Рег. до {formatDate(t.registrationDeadline || t.startDate)}
                    </span>
                  </div>
                  
                  {t.note && <p className="mt-2 text-sm text-gray-500 line-clamp-2">{t.note}</p>}
                </div>
                
                {t.participants.includes(profile?.uid || '') ? (
                  <button className="btn-secondary whitespace-nowrap" disabled>Вы записаны</button>
                ) : t.status === 'open' && t.participants.length < t.maxParticipants ? (
                  <button className="btn-primary whitespace-nowrap">Записаться</button>
                ) : (
                  <button className="btn-secondary whitespace-nowrap" disabled>Мест нет</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}