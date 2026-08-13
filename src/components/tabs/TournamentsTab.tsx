'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { sportNames, levelNames, sportIcons, sportColors, tournamentStatusNames } from '@/lib/theme';
import { Tournament, Sport, SkillLevel, NTRPRange } from '@/lib/types';
import { collection, query, orderBy, onSnapshot, Timestamp, addDoc, limit, doc, runTransaction, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, useRef } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';

const DEFAULT_START = Date.now() + 7 * 24 * 60 * 60 * 1000;
const DEFAULT_DEADLINE = Date.now() + 6 * 24 * 60 * 60 * 1000;

export function TournamentsTab() {
  const { profile, isStaff } = useAuth();
  const { showToast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const createBtnRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    title: '',
    sport: 'padel' as Sport,
    city: '',
    venue: '',
    district: '',
    startDate: new Date(DEFAULT_START),
    regDeadline: new Date(DEFAULT_DEADLINE),
    level: 'middle' as SkillLevel,
    ntrpRange: null as NTRPRange | null,
    maxParticipants: 16,
    note: '',
  });

  useEffect(() => {
    if (!profile) return;

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
        startDate: new Date(DEFAULT_START),
        regDeadline: new Date(DEFAULT_DEADLINE),
        level: 'middle', ntrpRange: null, maxParticipants: 16, note: '',
      });
    } catch {
      showToast('Ошибка при создании', 'error');
    }
  };

  const joinTournament = async (tournament: Tournament, leave: boolean) => {
    if (!profile) { showToast('Войдите в аккаунт', 'error'); return; }
    const tournamentRef = doc(db, 'tournaments', tournament.id);

    setJoiningId(tournament.id);
    try {
      // Транзакция: проверка лимита участников выполняется атомарно с записью,
      // чтобы не допустить переполнения турнира при одновременных записях.
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(tournamentRef);
        if (!snap.exists()) throw new Error('tournament_not_found');

        const data = snap.data() as Partial<Tournament>;
        const participants = data.participants || [];
        const isJoined = participants.includes(profile.uid);

        if (leave) {
          if (!isJoined) return;
          transaction.update(tournamentRef, { participants: arrayRemove(profile.uid) });
        } else {
          if (isJoined) throw new Error('already_joined');
          const maxParticipants = data.maxParticipants ?? tournament.maxParticipants;
          if (participants.length >= maxParticipants) throw new Error('tournament_full');
          transaction.update(tournamentRef, { participants: arrayUnion(profile.uid) });
        }
      });
      showToast(leave ? 'Вы вышли из турнира' : 'Вы записаны!', 'success');
    } catch {
      showToast(leave ? 'Не удалось выйти' : 'Не удалось записаться', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  const formatDate = (date: Date) => new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(date);

  useEffect(() => {
    if (!showCreate) return;
    const getFocusables = () => {
      if (!modalRef.current) return [];
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.hasAttribute('disabled'));
    };

    const prevFocus = document.activeElement as HTMLElement | null;
    const createBtn = createBtnRef.current;
    getFocusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreate(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const els = getFocusables();
      if (els.length === 0) return;
      if (e.shiftKey && document.activeElement === els[0]) {
        e.preventDefault();
        els[els.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === els[els.length - 1]) {
        e.preventDefault();
        els[0].focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      (prevFocus ?? createBtn)?.focus();
    };
  }, [showCreate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse-slow brand-gradient-text text-2xl font-bold">Загрузка турниров...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 pt-4 px-4 space-y-4">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="brand-gradient-text text-3xl font-extrabold tracking-tight">Турниры</h1>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">Соревнования по вашим любимым видам спорта</p>
        </div>
        {isStaff && (
          <button
            ref={createBtnRef}
            onClick={() => setShowCreate(true)}
            className="btn btn-brand-gradient press-scale"
          >
            + Создать турнир
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="tournaments-modal-title" ref={modalRef}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 brand-gradient" aria-hidden="true" />
            <h2 id="tournaments-modal-title" className="brand-gradient-text text-xl font-bold mb-4">Новый турнир</h2>
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
        <EmptyState
          icon="🏆"
          title="Турниров пока нет"
          description={isStaff ? 'Создайте первый турнир!' : 'Организаторы скоро добавят соревнования'}
        />
      ) : (
        <div className="space-y-3" role="list">
          {tournaments.map((t, index) => {
            const sportColor = sportColors[t.sport];
            const isJoined = t.participants.includes(profile?.uid || '');
            const spotsPct = t.maxParticipants > 0
              ? Math.max(0, Math.min(100, Math.round((t.participants.length / t.maxParticipants) * 100)))
              : 0;
            return (
            <article key={t.id} className={`card p-4 animate-in ${isJoined ? 'border-[var(--color-brand)]/50' : ''}`} style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }} role="listitem">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border"
                  style={{
                    backgroundColor: `${sportColor}14`,
                    borderColor: `${sportColor}40`,
                    boxShadow: `0 4px 16px -6px ${sportColor}55`,
                  }}>
                  <span aria-hidden="true">{sportIcons[t.sport]}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-lg truncate">{t.title}</h3>
                    <span className={`badge shrink-0 ${t.status === 'open' ? 'badge-green' : t.status === 'finished' ? 'badge-gray' : 'badge-red'}`}>
                      {tournamentStatusNames[t.status] || t.status}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t.venue}, {t.city} · {t.district}</p>

                  <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
                    <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                      <span aria-hidden="true">{sportIcons[t.sport]}</span>
                      {sportNames[t.sport]}
                    </span>
                    <span className="badge badge-gray">
                      {levelNames[t.level]}
                    </span>
                    <span className="text-[var(--color-text-secondary)] flex items-center gap-1">
                      <span aria-hidden="true">👥</span>
                      {t.participants.length}/{t.maxParticipants}
                    </span>
                  </div>

                  {isJoined && (
                    <span className="pill brand-gradient text-xs text-[var(--color-text-on-brand)]">
                      ✓ Вы участвуете
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-text-tertiary)] mt-2">
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true">📅</span>
                      {formatDate(t.startDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true">⏰</span>
                      Рег. до {formatDate(t.registrationDeadline || t.startDate)}
                    </span>
                  </div>

                  {t.note && <p className="mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2">{t.note}</p>}

                  <div className="h-1.5 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden mt-3">
                    <div className="h-full brand-gradient transition-all duration-500" style={{ width: `${spotsPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-3 border-t border-[var(--color-divider)] pt-3">
                {isJoined ? (
                  <button
                    onClick={() => joinTournament(t, true)}
                    disabled={joiningId === t.id}
                    className="btn btn-outline btn-sm"
                  >
                    {joiningId === t.id ? 'Отмена...' : 'Покинуть'}
                  </button>
                ) : t.status === 'open' && t.participants.length < t.maxParticipants ? (
                  <button
                    onClick={() => joinTournament(t, false)}
                    disabled={joiningId === t.id}
                    className="btn btn-primary btn-sm"
                  >
                    {joiningId === t.id ? 'Запись...' : 'Записаться'}
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-sm" disabled>Мест нет</button>
                )}
              </div>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}