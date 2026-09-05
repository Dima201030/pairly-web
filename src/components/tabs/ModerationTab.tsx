'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, updateDoc, doc, deleteDoc, setDoc, where, Timestamp } from 'firebase/firestore';
import { UserProfile, UserRole, Tournament, SavedVenue, Match, SupportChat } from '@/lib/types';
import { roleNames, supportStatusNames } from '@/lib/theme';
import { useEffect, useState } from 'react';
import { SupportChatPanel } from '@/components/panels/SupportChatPanel';
import { YandexMap } from '@/components/ui/YandexMap';

export type ModerationSection = 'tournaments' | 'matches' | 'users' | 'venues' | 'support';

const MODERATION_SECTIONS = [
  { id: 'tournaments', label: 'Турниры', icon: '🏆' },
  { id: 'matches', label: 'Матчи', icon: '🏟️' },
  { id: 'users', label: 'Пользователи', icon: '👥' },
  { id: 'venues', label: 'Клубы', icon: '🏟️' },
  { id: 'support', label: 'Поддержка', icon: '🎧' },
] as const;

export function ModerationTab() {
  const { profile, isStaff, isModerator, isHost } = useAuth();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<ModerationSection>('tournaments');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [venues, setVenues] = useState<SavedVenue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: '', city: '', district: '' });
  const [geocoding, setGeocoding] = useState(false);
  const [venueCoords, setVenueCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [userQuery, setUserQuery] = useState('');
  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
  const [supportChatsLoading, setSupportChatsLoading] = useState(true);
  const [openChat, setOpenChat] = useState<SupportChat | null>(null);

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

    const venuesQ = query(collection(db, 'venues'), limit(200));
    const venuesUnsub = onSnapshot(venuesQ, (snap) => {
      setVenues(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedVenue)));
      setVenuesLoading(false);
    });

    const matchesQ = query(
      collection(db, 'matches'),
      where('startDate', '>=', Timestamp.fromDate(new Date())),
      orderBy('startDate', 'desc'),
      limit(200)
    );
    const matchesUnsub = onSnapshot(matchesQ, (snap) => {
      setMatches(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          startDate: data.startDate?.toDate?.() || new Date(data.startDate),
        } as Match;
      }));
      setMatchesLoading(false);
    });

    const supportChatsQ = query(
      collection(db, 'supportChats'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    const supportChatsUnsub = onSnapshot(supportChatsQ, (snap) => {
      setSupportChats(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          lastMessageDate: data.lastMessageDate?.toDate?.(),
        } as SupportChat;
      }));
      setSupportChatsLoading(false);
    });

    return () => { usersUnsub(); tourneysUnsub(); venuesUnsub(); matchesUnsub(); supportChatsUnsub(); };
  }, [profile, isModerator, isHost]);

  if (!isStaff) {
    return (
      <div className="flex-1 flex items-center justify-center pb-24 md:pb-10 text-center px-4" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="text-4xl mb-3">🛡️</div>
        <p className="text-lg font-medium">Доступно только модераторам</p>
      </div>
    );
  }

  const toggleBlock = async (uid: string, blocked: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { blocked: !blocked });
      showToast(blocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован', 'success');
    } catch {
      showToast('Ошибка при изменении статуса', 'error');
    }
  };

  const changeRole = async (uid: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      showToast('Роль изменена', 'success');
    } catch {
      showToast('Ошибка при изменении роли', 'error');
    }
  };

  const deleteVenue = async (venueId: string) => {
    if (!confirm('Удалить это место?')) return;
    try {
      await deleteDoc(doc(db, 'venues', venueId));
      showToast('Место удалено', 'success');
    } catch {
      showToast('Ошибка при удалении', 'error');
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm('Удалить этот матч?')) return;
    try {
      await deleteDoc(doc(db, 'matches', matchId));
      showToast('Матч удалён', 'success');
    } catch {
      showToast('Ошибка при удалении', 'error');
    }
  };

  const geocodeAddress = async () => {
    const q = [newVenue.name, newVenue.district, newVenue.city]
      .filter(s => s.trim()).join(', ');
    if (!q) return;

    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
        headers: { 'Accept-Language': 'ru' }
      });
      const data = await res.json();
      if (data.length > 0) {
        setVenueCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      } else {
        showToast('Адрес не найден. Проверьте название.', 'error');
      }
    } catch {
      showToast('Ошибка геокодирования', 'error');
    } finally {
      setGeocoding(false);
    }
  };

  const saveVenue = async () => {
    const coords = venueCoords || (manualCoords.lat && manualCoords.lng ? { lat: parseFloat(manualCoords.lat), lng: parseFloat(manualCoords.lng) } : null);
    if (!coords || !newVenue.name.trim()) return;

    try {
      const venueId = crypto.randomUUID();
      await setDoc(doc(db, 'venues', venueId), {
        id: venueId,
        name: newVenue.name.trim(),
        city: newVenue.city.trim(),
        district: newVenue.district.trim(),
        sport: null,
        authorID: profile?.uid || null,
        latitude: coords.lat,
        longitude: coords.lng,
      });
      showToast('Место добавлено!', 'success');
      setShowAddVenue(false);
      setNewVenue({ name: '', city: '', district: '' });
      setVenueCoords(null);
      setManualCoords({ lat: '', lng: '' });
    } catch {
      showToast('Ошибка при сохранении', 'error');
    }
  };

  const roleColors: Record<string, string> = {
    user: 'badge-gray',
    moderator: 'badge-blue',
    support: 'badge-green',
    host: 'badge-yellow',
  };

  const visibleUsers = users.filter(user => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      user.displayName.toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q)
    );
  });

  const onTablistKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const ids = MODERATION_SECTIONS.map(s => s.id);
    const current = ids.indexOf(activeSection);
    setActiveSection(ids[(current + dir + ids.length) % ids.length]);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-10 pt-4 px-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Модерация</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Управление турнирами, игроками и клубами</p>
        </div>
        <span className={isHost ? 'badge badge-yellow' : 'badge badge-blue'}>
          {isHost ? 'Хозяин' : 'Модератор'}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Разделы модерации" onKeyDown={onTablistKeyDown}>
        {MODERATION_SECTIONS.map(s => (
          <button
            key={s.id}
            id={`mod-tab-${s.id}`}
            onClick={() => setActiveSection(s.id)}
            aria-controls="mod-panel"
            tabIndex={activeSection === s.id ? 0 : -1}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeSection === s.id
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
            }`}
            role="tab"
            aria-selected={activeSection === s.id}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div id="mod-panel" role="tabpanel" aria-labelledby={`mod-tab-${activeSection}`} className="space-y-4">

      {activeSection === 'users' && !usersLoading && (
        <div className="space-y-3">
          <input
            type="search"
            placeholder="Поиск по имени или email..."
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
            aria-label="Поиск пользователей"
            className="input-field"
          />
          {visibleUsers.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
              <p className="font-medium">Никого не найдено</p>
            </div>
          ) : (
          visibleUsers.map(user => (
            <div key={user.uid} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-primary)' }}>
                  {user.displayName[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.displayName}</p>
                  <p className="text-sm truncate" style={{ color: 'var(--color-text-tertiary)' }}>{user.email || 'email не указан'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={roleColors[user.role] || 'badge-gray'}>
                      {roleNames[user.role] || user.role}
                    </span>
                    {user.blocked && <span className="text-xs font-medium" style={{ color: 'var(--color-negative)' }}>🚫 Заблокирован</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={user.role}
                  onChange={e => changeRole(user.uid, e.target.value as UserRole)}
                  disabled={user.role === 'host' && !isHost}
                  className="input-field !py-1 !px-2"
                >
                  <option value="user">Игрок</option>
                  <option value="moderator">Модератор</option>
                  <option value="support">Поддержка</option>
                  {isHost && <option value="host">Хозяин</option>}
                </select>
                <button
                  onClick={() => toggleBlock(user.uid, user.blocked)}
                  className={`btn btn-sm ${user.blocked ? 'btn-primary' : 'btn-danger'}`}
                >
                  {user.blocked ? 'Разблокировать' : 'Заблокировать'}
                </button>
              </div>
            </div>
          ))
          )}
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
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t.venue}, {t.city}</p>
                </div>
                <span className={`badge ${t.status === 'open' ? 'badge-green' : t.status === 'finished' ? 'badge-gray' : 'badge-red'}`}>
                  {t.status === 'open' ? 'Открыт' : t.status === 'finished' ? 'Завершён' : 'Отменён'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'matches' && (
        <div className="space-y-3">
          {matchesLoading ? (
            <div className="flex items-center justify-center py-8">Загрузка...</div>
          ) : matches.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
              <p className="font-medium">Матчей пока нет</p>
            </div>
          ) : (
            matches.map(m => (
              <div key={m.id} className="card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{m.venue}</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{m.city}{m.district ? ` · ${m.district}` : ''}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)', opacity: 0.7 }}>
                      {new Date(m.startDate).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {m.sport} · {m.level}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${m.openSpots > 0 ? 'badge-green' : 'badge-gray'}`}>
                      {m.openSpots > 0 ? `${m.openSpots} мест` : 'Мест нет'}
                    </span>
                    <button
                      onClick={() => deleteMatch(m.id)}
                      className="btn btn-danger btn-sm flex-shrink-0"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeSection === 'venues' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{venues.length} мест</p>
            <button
              onClick={() => {
                setShowAddVenue(false);
                setNewVenue({ name: '', city: '', district: '' });
                setVenueCoords(null);
                setManualCoords({ lat: '', lng: '' });
              }}
              className="btn btn-primary btn-sm"
            >
              {showAddVenue ? 'Отмена' : '+ Добавить'}
            </button>
          </div>

          {showAddVenue && (
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold">Новое место</h3>
              <div>
                <label className="label">Название клуба *</label>
                <input
                  type="text"
                  placeholder="Название клуба"
                  value={newVenue.name}
                  onChange={e => setNewVenue(v => ({ ...v, name: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Город</label>
                <input
                  type="text"
                  placeholder="Город"
                  value={newVenue.city}
                  onChange={e => setNewVenue(v => ({ ...v, city: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Район</label>
                <input
                  type="text"
                  placeholder="Район"
                  value={newVenue.district}
                  onChange={e => setNewVenue(v => ({ ...v, district: e.target.value }))}
                  className="input-field"
                />
              </div>
              <button
                onClick={geocodeAddress}
                disabled={!newVenue.name.trim() || geocoding}
                className="btn btn-secondary btn-full"
              >
                {geocoding ? 'Определяем координаты...' : '📍 Определить координаты по адресу'}
              </button>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-divider)' }}>
                <div>
                  <label className="label">Широта (lat)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="55.7558"
                    value={manualCoords.lat}
                    onChange={e => setManualCoords(c => ({ ...c, lat: e.target.value }))}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="label">Долгота (lng)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="37.6173"
                    value={manualCoords.lng}
                    onChange={e => setManualCoords(c => ({ ...c, lng: e.target.value }))}
                    className="input-field text-sm"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const lat = parseFloat(manualCoords.lat);
                  const lng = parseFloat(manualCoords.lng);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setVenueCoords({ lat, lng });
                  }
                }}
                className="btn btn-secondary btn-full"
                disabled={!manualCoords.lat || !manualCoords.lng}
              >
                Использовать введённые координаты
              </button>
              {venueCoords && (
                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Координаты: {venueCoords.lat.toFixed(5)}, {venueCoords.lng.toFixed(5)}
                  <div className="mt-2">
                    <YandexMap lat={venueCoords.lat} lng={venueCoords.lng} height={200} />
                  </div>
                </div>
              )}
              <button
                onClick={saveVenue}
                disabled={!venueCoords || !newVenue.name.trim()}
                className="btn btn-primary btn-full"
              >
                Сохранить
              </button>
            </div>
          )}

          {venuesLoading ? (
            <div className="flex items-center justify-center py-8">Загрузка...</div>
          ) : venues.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
              <p className="font-medium">Мест пока нет</p>
              <p className="text-sm mt-1">Добавьте первое место для игры</p>
            </div>
          ) : (
            venues.map(v => (
              <div key={v.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{v.name}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{v.city}{v.district ? ` · ${v.district}` : ''}</p>
                  {(v.latitude !== 0 || v.longitude !== 0) && (
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--color-text-tertiary)', opacity: 0.7 }}>
                      {v.latitude?.toFixed(5)}, {v.longitude?.toFixed(5)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteVenue(v.id)}
                  className="btn btn-danger btn-sm flex-shrink-0"
                >
                  Удалить
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeSection === 'support' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} aria-hidden="true" />
              Обращения
            </h3>
            {supportChatsLoading ? (
              <div className="flex items-center justify-center py-8">Загрузка...</div>
            ) : supportChats.length === 0 ? (
              <div className="card p-6 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                <p className="font-medium">Обращений пока нет</p>
              </div>
            ) : (
              <div className="space-y-3">
                {supportChats.map(c => (
                  <div key={c.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{c.userName}</p>
                        {c.userCity && <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>· {c.userCity}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`badge shrink-0 ${c.status === 'closed' ? 'badge-gray' : c.status === 'waiting' ? 'badge-yellow' : 'badge-blue'}`}>
                          {supportStatusNames[c.status] || c.status}
                        </span>
                        {c.assignedStaffName && (
                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Оператор: {c.assignedStaffName}</span>
                        )}
                      </div>
                      {c.lastMessage && (
                        <p className="text-sm truncate mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{c.lastMessage}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setOpenChat(c)}
                      className="btn btn-outline btn-sm shrink-0"
                    >
                      Открыть
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full" style={{ background: 'var(--color-accent)' }} aria-hidden="true" />
              Агенты поддержки
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
              Пользователи с ролью «Поддержка». Обращения открываются выше.
            </p>
            {users.filter(u => u.role === 'support').length === 0 ? (
              <div className="text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>
                <p className="font-medium">Агентов поддержки пока нет</p>
                <p className="text-sm mt-1">Назначьте роль «Поддержка» во вкладке «Пользователи»</p>
              </div>
            ) : (
              users.filter(u => u.role === 'support').map(user => (
                <div key={user.uid} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-primary)' }}>
                      {user.displayName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{user.displayName}</p>
                      <p className="text-sm truncate" style={{ color: 'var(--color-text-tertiary)' }}>{user.email || 'email не указан'}</p>
                      {user.blocked && <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-negative)' }}>🚫 Заблокирован</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => changeRole(user.uid, 'user')}
                    className="btn btn-danger btn-sm flex-shrink-0"
                  >
                    Снять роль
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      </div>

      {openChat && (
        <SupportChatPanel
          mode="staff"
          chatId={openChat.id}
          onClose={() => setOpenChat(null)}
        />
      )}
    </div>
  );
}
