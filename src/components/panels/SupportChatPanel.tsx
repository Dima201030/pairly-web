'use client';

import { useEffect, useRef, useState } from 'react';
import {
  doc, onSnapshot, collection, query, orderBy,
  where, limit as firestoreLimit, setDoc, updateDoc, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SupportChat, SupportMessage } from '@/lib/types';
import { supportStatusNames } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

interface SupportChatPanelProps {
  mode: 'user' | 'staff';
  chatId?: string;
  onClose: () => void;
}

const OPEN_STATUSES = ['waiting', 'assigned', 'inProgress'];

export function SupportChatPanel({ mode, chatId, onClose }: SupportChatPanelProps) {
  const { profile, isStaff } = useAuth();
  const { showToast } = useToast();
  const [chat, setChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Определяем (или создаём) чат. Для персонала чат передаётся по id.
  useEffect(() => {
    if (!profile) return;

    if (mode === 'staff' && chatId) {
      const unsub = onSnapshot(doc(db, 'supportChats', chatId), (snap) => {
        if (snap.exists()) setChat({ id: snap.id, ...snap.data() } as SupportChat);
        setReady(true);
      });
      return unsub;
    }

    if (mode === 'user') {
      let cancelled = false;

      const ensureChat = async () => {
        try {
          const snap = await getDocs(
            query(
              collection(db, 'supportChats'),
              where('userID', '==', profile.uid),
              where('status', 'in', OPEN_STATUSES),
              firestoreLimit(1)
            )
          );
          if (cancelled) return;
          if (snap.docs.length > 0) {
            const d = snap.docs[0];
            const unsub = onSnapshot(doc(db, 'supportChats', d.id), (s) => {
              if (s.exists()) setChat({ id: s.id, ...s.data() } as SupportChat);
              setReady(true);
            });
            return unsub;
          }
          const chatId = crypto.randomUUID();
          await setDoc(doc(db, 'supportChats', chatId), {
            id: chatId,
            userID: profile.uid,
            userName: profile.displayName,
            userCity: profile.city ?? '',
            assignedStaffID: null,
            assignedStaffName: null,
            status: 'waiting',
            lastMessage: null,
            lastMessageDate: null,
            unreadCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          if (cancelled) return;
          const unsub = onSnapshot(doc(db, 'supportChats', chatId), (s) => {
            if (s.exists()) setChat({ id: s.id, ...s.data() } as SupportChat);
            setReady(true);
          });
          return unsub;
        } catch {
          if (!cancelled) {
            setReady(true);
            showToast('Не удалось открыть чат', 'error');
          }
        }
      };

      const unsubPromise = ensureChat();
      return () => {
        cancelled = true;
        unsubPromise.then(unsub => unsub?.());
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, mode, chatId]);

  // Подписка на сообщения после того, как чат известен.
  useEffect(() => {
    if (!chat) return;
    const unsub = onSnapshot(
      query(collection(db, 'supportChats', chat.id, 'supportMessages'), orderBy('sentAt')),
      (snap) => {
        setMessages(snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            chatID: d.chatID ?? chat.id,
            authorID: d.authorID,
            authorName: d.authorName,
            authorRole: d.authorRole,
            text: d.text,
            sentAt: d.sentAt?.toDate?.() || new Date(d.sentAt),
            read: d.read ?? false,
          } as SupportMessage;
        }));
      }
    );
    return unsub;
  }, [chat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !profile || !chat) return;
    setSending(true);
    try {
      const messageId = crypto.randomUUID();
      await setDoc(doc(db, 'supportChats', chat.id, 'supportMessages', messageId), {
        id: messageId,
        chatID: chat.id,
        authorID: profile.uid,
        authorName: profile.displayName,
        authorRole: profile.role,
        text: trimmed,
        sentAt: serverTimestamp(),
        read: false,
      });
      setText('');
    } catch {
      showToast('Не удалось отправить сообщение', 'error');
    } finally {
      setSending(false);
    }
  };

  const assignToMe = async () => {
    if (!profile || !chat) return;
    try {
      await updateDoc(doc(db, 'supportChats', chat.id), {
        assignedStaffID: profile.uid,
        assignedStaffName: profile.displayName,
        status: 'assigned',
        updatedAt: serverTimestamp(),
      });
      showToast('Чат взят в работу', 'success');
    } catch {
      showToast('Не удалось назначить', 'error');
    }
  };

  const setStatus = async (status: SupportChat['status']) => {
    if (!chat) return;
    try {
      await updateDoc(doc(db, 'supportChats', chat.id), {
        status,
        updatedAt: serverTimestamp(),
      });
      showToast(`Статус: ${supportStatusNames[status]}`, 'success');
    } catch {
      showToast('Не удалось изменить статус', 'error');
    }
  };

  const closeChat = async () => {
    if (!chat) return;
    try {
      // Пользователь может обновить в чате только поле status (правила).
      await updateDoc(doc(db, 'supportChats', chat.id), { status: 'closed' });
      showToast('Чат закрыт', 'success');
    } catch {
      showToast('Не удалось закрыть чат', 'error');
    }
  };

  if (!ready) {
    return (
      <Modal title="Поддержка" onClose={onClose} maxWidth="max-w-xl">
        <div className="flex items-center justify-center py-10 text-[var(--color-text-tertiary)]">
          Открываем чат...
        </div>
      </Modal>
    );
  }

  const mine = (authorID: string) => authorID === profile?.uid;

  return (
    <Modal title={mode === 'user' ? 'Поддержка' : chat ? `Чат: ${chat.userName}` : 'Поддержка'} onClose={onClose} maxWidth="max-w-xl">
      {!chat ? (
        <div className="py-10 text-center text-[var(--color-text-tertiary)]">
          Чат не найден
        </div>
      ) : (
        <div className="space-y-4">
          {mode === 'staff' && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{chat.userName}</span>
              {chat.userCity && <span className="text-[var(--color-text-tertiary)]">· {chat.userCity}</span>}
              <span className={`badge shrink-0 ${chat.status === 'closed' ? 'badge-gray' : chat.status === 'waiting' ? 'badge-yellow' : 'badge-blue'}`}>
                {supportStatusNames[chat.status] || chat.status}
              </span>
              {chat.assignedStaffName && (
                <span className="text-xs text-[var(--color-text-tertiary)]">· Оператор: {chat.assignedStaffName}</span>
              )}
            </div>
          )}

          {mode === 'user' && chat.status !== 'closed' && chat.assignedStaffName && (
            <p className="text-sm text-[var(--color-text-tertiary)]">
              Ваш оператор: <span className="text-[var(--color-brand-green)] font-medium">{chat.assignedStaffName}</span>
            </p>
          )}

          <div className="h-64 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-text-tertiary)] py-6">
                {mode === 'user'
                  ? 'Опишите вашу проблему — оператор скоро ответит'
                  : 'Пока нет сообщений'}
              </p>
            ) : (
              messages.map(m => {
                const isMine = mine(m.authorID);
                const isSystem = m.authorID === 'system';
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      isMine
                        ? 'brand-gradient text-[var(--color-text-on-brand)] rounded-br-md'
                        : isSystem
                          ? 'bg-[var(--color-surface-secondary)] border border-dashed border-[var(--color-border)] text-[var(--color-text-tertiary)] rounded-bl-md'
                          : 'bg-[var(--color-surface-secondary)] border border-[var(--color-divider)] rounded-bl-md'
                    }`}>
                      {!isMine && !isSystem && (
                        <p className="text-xs font-semibold mb-0.5 text-[var(--color-brand-green)]">{m.authorName}</p>
                      )}
                      <p className="break-words whitespace-pre-wrap">{m.text}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'opacity-80' : 'text-[var(--color-text-tertiary)]'}`}>
                        {new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(m.sentAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {chat.status !== 'closed' && (
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Сообщение..."
                className="input-field"
                maxLength={1000}
                aria-label="Сообщение"
              />
              <button type="submit" disabled={sending || !text.trim()} className="btn btn-brand-gradient shrink-0">
                {sending ? '...' : '➤'}
              </button>
            </form>
          )}

          {mode === 'staff' && isStaff && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--color-divider)]">
              {!chat.assignedStaffID && (
                <button onClick={assignToMe} className="btn btn-primary btn-sm">
                  Взять в работу
                </button>
              )}
              {chat.status !== 'resolved' && (
                <button onClick={() => setStatus('resolved')} className="btn btn-outline btn-sm">
                  Решён
                </button>
              )}
              <button onClick={() => setStatus('closed')} className="btn btn-outline btn-sm">
                Закрыть
              </button>
            </div>
          )}

          {mode === 'user' && chat.status !== 'closed' && (
            <div className="flex gap-2 pt-1 border-t border-[var(--color-divider)]">
              <button onClick={closeChat} className="btn btn-outline btn-sm">
                Закрыть чат
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}