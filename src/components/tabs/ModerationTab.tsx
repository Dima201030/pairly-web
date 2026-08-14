'use client';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, updateDoc, doc, deleteDoc, addDoc, where, Timestamp } from 'firebase/firestore';
import { UserProfile, UserRole, Tournament, SavedVenue, Match, SupportChat } from '@/lib/types';
import { roleNames, supportStatusNames } from '@/lib/theme';
import { useEffect, useState } from 'react';
import { SupportChatPanel } from '@/components/panels/SupportChatPanel';

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
      <div className="flex-1 flex items-center justify-center pb-24 md:pb-10 text-center text-[var(--color-text-secondary)] px-4">
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
      await addDoc(collection(db, 'venues'), {
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
    user: 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]',
    moderator: 'bg-[var(--color-brand)] text-white',
    support: 'bg-[var(--color-green)]/15 text-[var(--color-green-light)]',
    host: 'bg-[var(--color-yellow)]/15 text-[var(--color-yellow-light)]',
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
          <h1 className="brand-gradient-text text-3xl font-extrabold tracking-tight">Модерация</h1>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">Управление турнирами, игроками и клубами</p>
        </div>
        <span className={`badge ${isHost ? 'badge-yellow' : 'bg-[var(--color-brand)]/15 text-[var(--color-brand)]'}`}>
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
              activeSection === s.id ? 'brand-gradient text-[var(--color-text-on-brand)] shadow-md' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
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
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <p className="font-medium">Никого не найдено</p>
            </div>
          ) : (
          visibleUsers.map(user => (
            <div key={user.uid} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--color-brand-light)] flex items-center justify-center text-[var(--color-brand)] font-bold ring-2 ring-[var(--color-brand)]/20">
                  {user.displayName[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.displayName}</p>
                  <p className="text-sm text-[var(--color-text-tertiary)] truncate">{user.email || 'email не указан'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]'}`}>
                      {roleNames[user.role] || user.role}
                    </span>
                    {user.blocked && <span className="text-xs text-[var(--color-red-light)] font-medium">🚫 Заблокирован</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={user.role}
                  onChange={e => changeRole(user.uid, e.target.value as UserRole)}
                  disabled={user.role === 'host' && !isHost}
                  className="px-2 py-1 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                >
                  <option value="user">Игрок</option>
                  <option value="moderator">Модератор</option>
                  <option value="support">Поддержка</option>
                  {isHost && <option value="host">Хозяин</option>}
                </select>
                <button
                  onClick={() => toggleBlock(user.uid, user.blocked)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium ${user.blocked ? 'bg-[var(--color-green)]/15 text-[var(--color-green-light)]' : 'bg-[var(--color-red)]/15 text-[var(--color-red-light)]'}`}
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
                  <p className="text-sm text-[var(--color-text-tertiary)]">{t.venue}, {t.city}</p>
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
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <p className="font-medium">Матчей пока нет</p>
            </div>
          ) : (
            matches.map(m => (
              <div key={m.id} className="card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{m.venue}</p>
                    <p className="text-sm text-[var(--color-text-tertiary)]">{m.city}{m.district ? ` · ${m.district}` : ''}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]/70 mt-0.5">
                      {new Date(m.startDate).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {m.sport} · {m.level}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${m.openSpots > 0 ? 'badge-green' : 'badge-gray'}`}>
                      {m.openSpots > 0 ? `${m.openSpots} мест` : 'Мест нет'}
                    </span>
                    <button
                      onClick={() => deleteMatch(m.id)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-red)]/15 text-[var(--color-red-light)] font-medium flex-shrink-0"
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
            <p className="text-sm text-[var(--color-text-tertiary)]">{venues.length} мест</p>
            <button
              onClick={() => {
                setShowAddVenue(false);
                setNewVenue({ name: '', city: '', district: '' });
                setVenueCoords(null);
                setManualCoords({ lat: '', lng: '' });
              }}
              className="btn btn-brand-gradient btn-sm"
            >
              {showAddVenue ? 'Отмена' : '+ Добавить'}
            </button>
          </div>

          {showAddVenue && (
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold">Новое место</h3>
              <input
                type="text"
                placeholder="Название клуба *"
                value={newVenue.name}
                onChange={e => setNewVenue(v => ({ ...v, name: e.target.value }))}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Город"
                value={newVenue.city}
                onChange={e => setNewVenue(v => ({ ...v, city: e.target.value }))}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Район"
                value={newVenue.district}
                onChange={e => setNewVenue(v => ({ ...v, district: e.target.value }))}
                className="input-field"
              />
              <button
                onClick={geocodeAddress}
                disabled={!newVenue.name.trim() || geocoding}
                className="w-full px-4 py-2 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] text-sm font-medium hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
              >
                {geocoding ? 'Определяем координаты...' : '📍 Определить координаты по адресу'}
              </button>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-divider)]">
                <div>
                  <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Широта (lat)</label>
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
                  <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Долгота (lng)</label>
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
                className="w-full px-4 py-2 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] text-sm font-medium hover:bg-[var(--color-surface-hover)]"
                disabled={!manualCoords.lat || !manualCoords.lng}
              >
                Использовать введённые координаты
              </button>
              {venueCoords && (
                <div className="text-sm text-[var(--color-text-secondary)]">
                  Координаты: {venueCoords.lat.toFixed(5)}, {venueCoords.lng.toFixed(5)}
                  <div className="mt-2 rounded-xl overflow-hidden border border-[var(--color-border)]">
                    <iframe
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Карта: ${newVenue.name}`}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${venueCoords.lng - 0.01}%2C${venueCoords.lat - 0.005}%2C${venueCoords.lng + 0.01}%2C${venueCoords.lat + 0.005}&layer=mapnik&marker=${venueCoords.lat}%2C${venueCoords.lng}`}
                    />
                  </div>
                </div>
              )}
              <button
                onClick={saveVenue}
                disabled={!venueCoords || !newVenue.name.trim()}
                className="btn btn-brand-gradient btn-full"
              >
                Сохранить
              </button>
            </div>
          )}

          {venuesLoading ? (
            <div className="flex items-center justify-center py-8">Загрузка...</div>
          ) : venues.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <p className="font-medium">Мест пока нет</p>
              <p className="text-sm mt-1">Добавьте первое место для игры</p>
            </div>
          ) : (
            venues.map(v => (
              <div key={v.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{v.name}</p>
                  <p className="text-sm text-[var(--color-text-tertiary)]">{v.city}{v.district ? ` · ${v.district}` : ''}</p>
                  {(v.latitude !== 0 || v.longitude !== 0) && (
                    <p className="text-xs text-[var(--color-text-tertiary)]/70 mt-0.5 font-mono">
                      {v.latitude?.toFixed(5)}, {v.longitude?.toFixed(5)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteVenue(v.id)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-red)]/15 text-[var(--color-red-light)] font-medium flex-shrink-0"
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
              <span className="w-1.5 h-4 rounded-full brand-gradient" aria-hidden="true" />
              Обращения
            </h3>
            {supportChatsLoading ? (
              <div className="flex items-center justify-center py-8">Загрузка...</div>
            ) : supportChats.length === 0 ? (
              <div className="card p-6 text-center text-[var(--color-text-tertiary)]">
                <p className="font-medium">Обращений пока нет</p>
              </div>
            ) : (
              <div className="space-y-3">
                {supportChats.map(c => (
                  <div key={c.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{c.userName}</p>
                        {c.userCity && <span className="text-sm text-[var(--color-text-tertiary)]">· {c.userCity}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`badge shrink-0 ${c.status === 'closed' ? 'badge-gray' : c.status === 'waiting' ? 'badge-yellow' : 'badge-blue'}`}>
                          {supportStatusNames[c.status] || c.status}
                        </span>
                        {c.assignedStaffName && (
                          <span className="text-xs text-[var(--color-text-tertiary)]">Оператор: {c.assignedStaffName}</span>
                        )}
                      </div>
                      {c.lastMessage && (
                        <p className="text-sm text-[var(--color-text-tertiary)] truncate mt-1">{c.lastMessage}</p>
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
              <span className="w-1.5 h-4 rounded-full brand-gradient" aria-hidden="true" />
              Агенты поддержки
            </h3>
            <p className="text-sm text-[var(--color-text-tertiary)] mb-3">
              Пользователи с ролью «Поддержка». Обращения открываются выше.
            </p>
            {users.filter(u => u.role === 'support').length === 0 ? (
              <div className="text-center py-6 text-[var(--color-text-tertiary)]">
                <p className="font-medium">Агентов поддержки пока нет</p>
                <p className="text-sm mt-1">Назначьте роль «Поддержка» во вкладке «Пользователи»</p>
              </div>
            ) : (
              users.filter(u => u.role === 'support').map(user => (
                <div key={user.uid} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-brand-light)] flex items-center justify-center text-[var(--color-brand)] font-bold ring-2 ring-[var(--color-brand)]/20">
                      {user.displayName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{user.displayName}</p>
                      <p className="text-sm text-[var(--color-text-tertiary)] truncate">{user.email || 'email не указан'}</p>
                      {user.blocked && <p className="text-xs text-[var(--color-red-light)] font-medium mt-1">🚫 Заблокирован</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => changeRole(user.uid, 'user')}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-red)]/15 text-[var(--color-red-light)] font-medium flex-shrink-0"
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
