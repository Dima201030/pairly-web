import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';
import { UserProfile, UserRole, Tournament, Sport, SkillLevel, SupportChat, SupportChatStatus } from '@/lib/types';
import { useEffect, useState } from 'react';

export function ModerationTab() {
  const { profile, isStaff, isModerator, isHost } = useAuth();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<'tournaments' | 'users' | 'venues' | 'support'>('tournaments');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
  const [supportLoading, setSupportLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    
    const usersQ = query(collection(db, 'users'), orderBy('createdAt'), limit(500));
    const usersUnsub = onSnapshot(usersQ, (snap) => {
      let data = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      if (isModerator && !isHost) data = data.filter(u => u.role !== 'host');
      setUsers(data);
      setUsersLoading(false);
    });

    const tourneysQ = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'), limit(100));
    const tourneysUnsub = onSnapshot(tourneysQ, (snap) => {
      setTournaments(snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, startDate: data.startDate?.toDate?.() } as Tournament;
      }));
      setTournamentsLoading(false);
    });

    const supportQ = query(collection(db, 'supportChats'), orderBy('updatedAt', 'desc'), limit(100));
    const supportUnsub = onSnapshot(supportQ, (snap) => {
      setSupportChats(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportChat)));
      setSupportLoading(false);
    });

    return () => { usersUnsub(); tourneysUnsub(); supportUnsub(); };
  }, [profile, isModerator, isHost]);

  if (!isStaff) {
    return (
      <div className="flex-1 flex items-center justify-center pb-24 text-center text-gray-500 px-4">
        <div className="text-4xl mb-3">🛡️</div>
        <p className="text-lg font-medium">Доступно только модераторам</p>
      </div>
    );
  }

  const toggleBlock = async (uid: string, blocked: boolean) => {
    await updateDoc(doc(db, 'users', uid), { blocked: !blocked });
    showToast(blocked ? 'Разблокирован' : 'Заблокирован', 'success');
  };

  const changeRole = async (uid: string, role: UserRole) => {
    await updateDoc(doc(db, 'users', uid), { role });
    showToast('Роль изменена', 'success');
  };

  const roleColors: Record<string, string> = {
    user: 'bg-gray-100 text-gray-600',
    moderator: 'bg-[var(--color-brand)] text-white',
    support: 'bg-green-100 text-green-700',
    host: 'bg-yellow-100 text-yellow-700',
  };

  const roleNames: Record<string, string> = {
    user: 'Игрок',
    moderator: 'Модератор',
    support: 'Поддержка',
    host: 'Хозяин',
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 pt-4 px-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Модерация</h1>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isHost ? 'bg-yellow-100 text-yellow-700' : 'bg-[var(--color-brand)] text-white'}`}>
          {isHost ? 'Хозяин' : 'Модератор'}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist">
        {[
          { id: 'tournaments', label: 'Турниры', icon: '🏆' },
          { id: 'users', label: 'Пользователи', icon: '👥' },
          { id: 'venues', label: 'Клубы', icon: '🏟️' },
          { id: 'support', label: 'Поддержка', icon: '🎧' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id as any)}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
              activeSection === s.id ? 'bg-[var(--color-brand)] text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
            role="tab"
            aria-selected={activeSection === s.id}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'users' && !usersLoading && (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.uid} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--color-brand-light)] flex items-center justify-center text-[var(--color-brand)] font-bold">
                  {user.displayName[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.displayName}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email || 'email не указан'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                      {roleNames[user.role] || user.role}
                    </span>
                    {user.blocked && <span className="text-xs text-red-600 font-medium">🚫 Заблокирован</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={user.role}
                  onChange={e => changeRole(user.uid, e.target.value as UserRole)}
                  disabled={user.role === 'host' && !isHost}
                  className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="user">Игрок</option>
                  <option value="moderator">Модератор</option>
                  <option value="support">Поддержка</option>
                  {isHost && <option value="host">Хозяин</option>}
                </select>
                <button
                  onClick={() => toggleBlock(user.uid, user.blocked)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium ${user.blocked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {user.blocked ? 'Разблокировать' : 'Заблокировать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'tournaments' && (
        <div className="space-y-3">
          {tournamentsLoading ? (
            <div className="flex items-center justify-center py-8">Загрузка...</div>
          ) : tournaments.map(t => (
            <div key={t.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="text-sm text-gray-500">{t.venue}, {t.city}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {t.status === 'open' ? 'Открыт' : t.status === 'finished' ? 'Завершён' : 'Отменён'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'support' && (
        <div className="space-y-3">
          {supportLoading ? (
            <div className="flex items-center justify-center py-8">Загрузка...</div>
          ) : supportChats.map(chat => (
            <div key={chat.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{chat.userName}</p>
                  <p className="text-sm text-gray-500">{chat.userCity} · {chat.unreadCount} новых</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${chat.status === 'waiting' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {chat.status === 'waiting' ? 'Ожидает' : 'В работе'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'venues' && (
        <div className="text-center py-8 text-gray-500">
          Управление клубами в разработке
        </div>
      )}
    </div>
  );
}