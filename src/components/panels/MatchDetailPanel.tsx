'use client';

import { useEffect, useRef, useState } from 'react';
import {
  doc, onSnapshot, collection, query, orderBy,
  runTransaction, arrayUnion, arrayRemove, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Match, ChatMessage } from '@/lib/types';
import { sportNames, levelNames, sportIcons, sportColors } from '@/lib/theme';
import { formatDate, timeUntil } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { YandexMap } from '@/components/ui/YandexMap';

interface MatchDetailPanelProps {
  matchId: string;
  initial: Match;
  onClose: () => void;
}

export function MatchDetailPanel({ matchId, initial, onClose }: MatchDetailPanelProps) {
  const { profile, isStaff } = useAuth();
  const { showToast } = useToast();
  const [match, setMatch] = useState<Match>(initial);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const unsubMatch = onSnapshot(doc(db, 'matches', matchId), (snap) => {
      if (!snap.exists()) {
        onClose();
        return;
      }
      const d = snap.data();
      setMatch({
        id: snap.id,
        authorId: d.authorId,
        sport: d.sport,
        city: d.city,
        venue: d.venue,
        district: d.district,
        startDate: d.startDate?.toDate?.() || new Date(d.startDate),
        level: d.level,
        openSpots: d.openSpots,
        totalSpots: d.totalSpots,
        hostName: d.hostName,
        hostRating: d.hostRating,
        hostNTRP: d.hostNTRP,
        note: d.note,
        tennisType: d.tennisType,
        ntrpRange: d.ntrpRange,
        latitude: d.latitude,
        longitude: d.longitude,
        participants: d.participants || [],
      } as Match);
    });

    const unsubMsgs = onSnapshot(
      query(collection(db, 'matches', matchId, 'messages'), orderBy('sentAt')),
      (snap) => {
        setMessages(snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            matchID: d.matchID ?? matchId,
            authorID: d.authorID,
            authorName: d.authorName,
            text: d.text,
            sentAt: d.sentAt?.toDate?.() || new Date(d.sentAt),
          } as ChatMessage;
        }));
      }
    );

    return () => { unsubMatch(); unsubMsgs(); };
  }, [matchId]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const isJoined = match.participants.includes(profile?.uid || '');
  const sportColor = sportColors[match.sport];
  const hasMap = match.latitude !== 0 || match.longitude !== 0;

  const toggleJoin = async (leave: boolean) => {
    if (!profile) { showToast('Войдите в аккаунт', 'error'); return; }
    setJoining(true);
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(doc(db, 'matches', matchId));
        if (!snap.exists()) throw new Error('match_not_found');
        const data = snap.data() as Partial<Match>;
        const participants = data.participants || [];
        const openSpots = data.openSpots ?? 0;
        if (leave) {
          if (!participants.includes(profile.uid)) return;
          transaction.update(doc(db, 'matches', matchId), {
            participants: arrayRemove(profile.uid),
            openSpots: openSpots + 1,
          });
        } else {
          if (participants.includes(profile.uid)) throw new Error('already_joined');
          if (openSpots <= 0) throw new Error('match_full');
          transaction.update(doc(db, 'matches', matchId), {
            participants: arrayUnion(profile.uid),
            openSpots: openSpots - 1,
          });
        }
      });
      showToast(leave ? 'Вы вышли из матча' : 'Вы записаны!', 'success');
    } catch {
      showToast(leave ? 'Не удалось выйти' : 'Не удалось записаться', 'error');
    } finally {
      setJoining(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !profile) return;
    setSending(true);
    try {
      const messageId = crypto.randomUUID();
      await setDoc(doc(db, 'matches', matchId, 'messages', messageId), {
        id: messageId,
        matchID: matchId,
        authorID: profile.uid,
        authorName: profile.displayName,
        text: trimmed,
        sentAt: serverTimestamp(),
      });
      setText('');
    } catch {
      showToast('Не удалось отправить сообщение', 'error');
    } finally {
      setSending(false);
    }
  };

  const participantName = (uid: string) =>
    uid === match.authorId ? match.hostName : 'Игрок';

  const canChat = profile && (isJoined || isStaff);

  return (
    <Modal title={match.venue} onClose={onClose} maxWidth="max-w-2xl" panelBg="#141414">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill pill-inactive !py-0.5 text-xs">{match.city}</span>
              <span className="badge" style={{ backgroundColor: `${sportColor}1F`, color: sportColor }}>
                {sportIcons[match.sport]} {sportNames[match.sport]}
              </span>
              <span className="badge badge-gray">{levelNames[match.level]}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Когда</p>
                <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{formatDate(match.startDate)}</p>
                <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{timeUntil(match.startDate)}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Места</p>
                <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{match.openSpots > 0 ? `Свободно ${match.openSpots}` : 'Мест нет'}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>из {match.totalSpots}</p>
              </div>
            </div>

            {match.note && (
              <div className="p-3 rounded-xl text-sm" style={{ background: '#1a1a1a', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)' }}>
                {match.note}
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} aria-hidden="true" />
                Участники ({match.participants.length}/{match.totalSpots})
              </h3>
              <ul className="space-y-1.5">
                {match.participants.map((uid) => (
                  <li key={uid} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ background: '#1a1a1a', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                    <span className="w-8 h-8 shrink-0 rounded-full font-bold flex items-center justify-center text-sm" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-primary)' }}>
                      {(participantName(uid) || '?')[0].toUpperCase()}
                    </span>
                    <span className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{participantName(uid)}</span>
                    {uid === match.authorId && <span className="badge badge-blue ml-auto">Хост</span>}
                    {uid === profile?.uid && <span className="badge badge-green ml-auto">Вы</span>}
                  </li>
                ))}
                {match.participants.length === 0 && (
                  <li className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Пока никто не записан</li>
                )}
              </ul>
            </div>

            <div className="flex gap-2">
              {isJoined ? (
                <button onClick={() => toggleJoin(true)} disabled={joining} className="btn btn-outline btn-full">
                  {joining ? 'Отмена...' : 'Покинуть матч'}
                </button>
              ) : (
                <button
                  onClick={() => toggleJoin(false)}
                  disabled={joining || match.openSpots === 0}
                  className={`btn btn-full ${match.openSpots > 0 ? 'btn-primary' : 'btn-outline'}`}
                >
                  {joining ? 'Запись...' : match.openSpots > 0 ? 'Записаться' : 'Мест нет'}
                </button>
              )}
            </div>
          </div>

          {hasMap && (
            <div className="sm:w-[200px] sm:h-[200px] shrink-0 rounded-2xl overflow-hidden">
              <YandexMap lat={match.latitude} lng={match.longitude} height={200} className="w-full h-full" />
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--color-divider)' }} className="pt-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} aria-hidden="true" />
            Чат матча
          </h3>

          <div className="h-44 sm:h-56 overflow-y-auto space-y-2.5 p-3 rounded-xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            {messages.length === 0 ? (
              <p className="text-center text-sm py-6" style={{ color: 'var(--color-text-tertiary)' }}>
                {canChat ? 'Сообщений пока нет — напишите первым!' : 'Сообщения появятся после записи'}
              </p>
            ) : (
              messages.map(m => {
                const mine = m.authorID === profile?.uid;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      mine
                        ? 'rounded-br-md'
                        : 'rounded-bl-md'
                    }`} style={{
                      background: mine ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: mine ? 'var(--color-accent-on)' : 'var(--color-text-primary)',
                      border: mine ? 'none' : '1px solid var(--color-divider)',
                    }}>
                      {!mine && <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>{m.authorName}</p>}
                      <p className="break-words whitespace-pre-wrap">{m.text}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'opacity-80' : ''}`} style={!mine ? { color: 'var(--color-text-tertiary)' } : undefined}>
                        {new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(m.sentAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {canChat ? (
            <form onSubmit={sendMessage} className="flex gap-2 mt-3">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Сообщение участникам..."
                className="input-field min-w-0"
                maxLength={500}
                aria-label="Сообщение в чат"
              />
              <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary btn-sm shrink-0">
                {sending ? '...' : '➤'}
              </button>
            </form>
          ) : (
            <p className="text-sm mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
              Запишитесь в матч, чтобы писать в чат
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
