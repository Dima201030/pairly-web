'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { sportNames, levelNames, sportIcons, sportColors, tournamentStatusNames } from '@/lib/theme';
import { Tournament, Sport, SkillLevel, NTRPRange } from '@/lib/types';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, setDoc, limit, runTransaction, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, useRef } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { TournamentDetailPanel } from '@/components/panels/TournamentDetailPanel';

const DEFAULT_START = Date.now() + 7 * 24 * 60 * 60 * 1000;
const DEFAULT_DEADLINE = Date.now() + 6 * 24 * 60 * 60 * 1000;

export function TournamentsTab() {
  const { profile, isStaff } = useAuth();
  const { showToast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
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
      const tournamentId = crypto.randomUUID();
      await setDoc(doc(db, 'tournaments', tournamentId), {
        id: tournamentId,
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
        <div className="animate-pulse-slow text-lg font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>Загрузка турниров...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-6 pt-5 px-4 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Турниры</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Соревнования по вашим любимым видам спорта</p>
        </div>
        {isStaff && (
          <button
            ref={createBtnRef}
            onClick={() => setShowCreate(true)}
            className="btn btn-primary press-scale"
          >
            + Создать
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-[var(--z-modal)]" style={{ background: 'rgba(0,0,0,0.6)' }} role="dialog" aria-modal="true" aria-labelledby="tournaments-modal-title" ref={modalRef}>
          <div className="card-elevated max-w-md w-full max-h-[90vh] overflow-y-auto p-5 relative" style={{ background: 'var(--color-surface)' }}>
            <h2 id="tournaments-modal-title" className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Новый турнир</h2>
            <form onSubmit={createTournament} className="space-y-3">
              <div>
                <label className="label" htmlFor="t-title">Название</label>
                <input id="t-title" type="text" placeholder="Название турнира" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="label" htmlFor="t-sport">Спорт</label>
                <select id="t-sport" value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value as Sport }))} className="input-field">
                  {(['padel', 'tennis', 'badminton', 'squash', 'football', 'running'] as Sport[]).map(s => (
                    <option key={s} value={s}>{sportNames[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="t-city">Город</label>
                <input id="t-city" type="text" placeholder="Город" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="label" htmlFor="t-venue">Клуб</label>
                <input id="t-venue" type="text" placeholder="Клуб" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="label" htmlFor="t-district">Район</label>
                <input id="t-district" type="text" placeholder="Район" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="t-start">Дата начала</label>
                  <input id="t-start" type="datetime-local" value={form.startDate.toISOString().slice(0, 16)} onChange={e => setForm(f => ({ ...f, startDate: new Date(e.target.value) }))} className="input-field" />
                </div>
                <div>
                  <label className="label" htmlFor="t-deadline">Рег. до</label>
                  <input id="t-deadline" type="datetime-local" value={form.regDeadline.toISOString().slice(0, 16)} onChange={e => setForm(f => ({ ...f, regDeadline: new Date(e.target.value) }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="t-level">Уровень</label>
                <select id="t-level" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as SkillLevel }))} className="input-field">
                  {(['any', 'beginner', 'middle', 'advanced'] as SkillLevel[]).map(l => (
                    <option key={l} value={l}>{levelNames[l]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="t-max">Макс. участников</label>
                <input id="t-max" type="number" min="4" max="128" value={form.maxParticipants} onChange={e => setForm(f => ({ ...f, maxParticipants: parseInt(e.target.value) || 16 }))} className="input-field" />
              </div>
              <div>
                <label className="label" htmlFor="t-note">Описание</label>
                <textarea id="t-note" placeholder="Описание" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} className="input-field resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary flex-1">
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary flex-1">
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="list">
          {tournaments.map((t, index) => {
            const sportColor = sportColors[t.sport];
            const isJoined = t.participants.includes(profile?.uid || '');
            const spotsPct = t.maxParticipants > 0
              ? Math.max(0, Math.min(100, Math.round((t.participants.length / t.maxParticipants) * 100)))
              : 0;
            return (
            <article key={t.id} className={`card-interactive p-4 animate-in ${isJoined ? 'border-[var(--color-accent)]/30' : ''}`} style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }} role="listitem" onClick={() => setSelectedTournament(t)}>
              <div className="flex gap-3">
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{
                    backgroundColor: `${sportColor}1F`,
                    border: `1px solid ${sportColor}33`,
                  }}
                >
                  <span aria-hidden="true">{sportIcons[t.sport]}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h3>
                    <span className={`badge shrink-0 ${t.status === 'open' ? 'badge-green' : t.status === 'finished' ? 'badge-gray' : 'badge-red'}`}>
                      {tournamentStatusNames[t.status] || t.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t.venue}, {t.city}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                <span className="flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <span aria-hidden="true">{sportIcons[t.sport]}</span>
                  {sportNames[t.sport]}
                </span>
                <span className="badge badge-gray">{levelNames[t.level]}</span>
                <span className="flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <span aria-hidden="true">👥</span>
                  {t.participants.length}/{t.maxParticipants}
                </span>
              </div>

              {isJoined && (
                <div className="pill self-start mt-2" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                  ✓ Вы участвуете
                </div>
              )}

              <div className="flex items-center gap-2 text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                <span>📅 {formatDate(t.startDate)}</span>
              </div>

              {t.note && <p className="mt-2 text-xs line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{t.note}</p>}

              <div className="h-1 rounded-full overflow-hidden mt-3" style={{ background: 'var(--color-surface-hover)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${spotsPct}%`, background: 'var(--color-accent)' }} />
              </div>

              <div className="flex justify-end mt-3 pt-2 border-t border-[var(--color-divider)]">
                {isJoined ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); joinTournament(t, true); }}
                    disabled={joiningId === t.id}
                    className="btn btn-outline btn-sm"
                  >
                    {joiningId === t.id ? '...' : 'Выйти'}
                  </button>
                ) : t.status === 'open' && t.participants.length < t.maxParticipants ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); joinTournament(t, false); }}
                    disabled={joiningId === t.id}
                    className="btn btn-primary btn-sm"
                  >
                    {joiningId === t.id ? '...' : 'Записаться'}
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

      {selectedTournament && (
        <TournamentDetailPanel
          tournamentId={selectedTournament.id}
          initial={selectedTournament}
          onClose={() => setSelectedTournament(null)}
        />
      )}
    </div>
  );
}
