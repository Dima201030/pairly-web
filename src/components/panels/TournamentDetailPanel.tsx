'use client';

import { useEffect, useState } from 'react';
import {
  doc, onSnapshot, runTransaction, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tournament } from '@/lib/types';
import { sportNames, levelNames, sportIcons, sportColors, tournamentStatusNames } from '@/lib/theme';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

interface TournamentDetailPanelProps {
  tournamentId: string;
  initial: Tournament;
  onClose: () => void;
}

export function TournamentDetailPanel({ tournamentId, initial, onClose }: TournamentDetailPanelProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [tournament, setTournament] = useState<Tournament>(initial);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'tournaments', tournamentId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setTournament({
        id: snap.id,
        ...d,
        startDate: d.startDate?.toDate?.() || new Date(d.startDate),
        registrationDeadline: d.registrationDeadline?.toDate?.(),
      } as Tournament);
    });
    return unsub;
  }, [tournamentId]);

  const isJoined = tournament.participants.includes(profile?.uid || '');
  const sportColor = sportColors[tournament.sport];
  const spotsPct = tournament.maxParticipants > 0
    ? Math.max(0, Math.min(100, Math.round((tournament.participants.length / tournament.maxParticipants) * 100)))
    : 0;

  const toggleJoin = async (leave: boolean) => {
    if (!profile) { showToast('Войдите в аккаунт', 'error'); return; }
    setJoining(true);
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(doc(db, 'tournaments', tournamentId));
        if (!snap.exists()) throw new Error('tournament_not_found');
        const data = snap.data() as Partial<Tournament>;
        const participants = data.participants || [];
        if (leave) {
          if (!participants.includes(profile.uid)) return;
          transaction.update(doc(db, 'tournaments', tournamentId), { participants: arrayRemove(profile.uid) });
        } else {
          if (participants.includes(profile.uid)) throw new Error('already_joined');
          const maxParticipants = data.maxParticipants ?? tournament.maxParticipants;
          if (participants.length >= maxParticipants) throw new Error('tournament_full');
          transaction.update(doc(db, 'tournaments', tournamentId), { participants: arrayUnion(profile.uid) });
        }
      });
      showToast(leave ? 'Вы вышли из турнира' : 'Вы записаны!', 'success');
    } catch {
      showToast(leave ? 'Не удалось выйти' : 'Не удалось записаться', 'error');
    } finally {
      setJoining(false);
    }
  };

  const participantName = (uid: string) =>
    uid === tournament.organizerID ? tournament.organizerName : 'Игрок';

  const isFull = tournament.participants.length >= tournament.maxParticipants;

  return (
    <Modal title={tournament.title} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge shrink-0" style={{ backgroundColor: `${sportColor}1F`, color: sportColor }}>
            {sportIcons[tournament.sport]} {sportNames[tournament.sport]}
          </span>
          <span className="badge badge-gray">{levelNames[tournament.level]}</span>
          <span className={`badge shrink-0 ${tournament.status === 'open' ? 'badge-green' : tournament.status === 'finished' ? 'badge-gray' : 'badge-red'}`}>
            {tournamentStatusNames[tournament.status] || tournament.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Место</p>
            <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{tournament.venue}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{tournament.city}{tournament.district ? ` · ${tournament.district}` : ''}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Дата начала</p>
            <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{formatDate(tournament.startDate)}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Рег. до {formatDate(tournament.registrationDeadline || tournament.startDate)}
            </p>
          </div>
        </div>

        {tournament.note && (
          <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)' }}>
            {tournament.note}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-1 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} aria-hidden="true" />
              Участники ({tournament.participants.length}/{tournament.maxParticipants})
            </h3>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Организатор: {tournament.organizerName}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--color-surface-hover)' }}>
            <div className="h-full transition-all duration-500" style={{ width: `${spotsPct}%`, background: 'var(--color-accent)' }} />
          </div>
          <ul className="space-y-1.5">
            {tournament.participants.map(uid => (
              <li key={uid} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <span className="w-8 h-8 shrink-0 rounded-full font-bold flex items-center justify-center text-sm" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-primary)' }}>
                  {(participantName(uid) || '?')[0].toUpperCase()}
                </span>
                <span className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{participantName(uid)}</span>
                {uid === tournament.organizerID && <span className="badge badge-blue ml-auto">Организатор</span>}
                {uid === profile?.uid && <span className="badge badge-green ml-auto">Вы</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          {isJoined ? (
            <button onClick={() => toggleJoin(true)} disabled={joining} className="btn btn-outline btn-full">
              {joining ? 'Отмена...' : 'Покинуть турнир'}
            </button>
          ) : tournament.status === 'open' && !isFull ? (
            <button onClick={() => toggleJoin(false)} disabled={joining} className="btn btn-primary btn-full">
              {joining ? 'Запись...' : 'Записаться'}
            </button>
          ) : (
            <button className="btn btn-secondary btn-full" disabled>
              {isFull ? 'Мест нет' : 'Турнир закрыт'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
