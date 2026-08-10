'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { sportNames, levelNames, sportIcons } from '@/lib/theme';
import { Sport, SkillLevel, SavedVenue } from '@/lib/types';
import { collection, addDoc, Timestamp, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function CreateMatchTab() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<SavedVenue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);

  const [form, setForm] = useState({
    sport: 'padel' as Sport,
    venueId: '',
    startDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
    level: 'middle' as SkillLevel,
    openSpots: 1,
    note: '',
    tennisType: 'singles' as 'singles' | 'doubles',
  });

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const snap = await getDocs(collection(db, 'venues'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedVenue));
        setVenues(data);
      } catch {
        showToast('Не удалось загрузить клубы', 'error');
      } finally {
        setVenuesLoading(false);
      }
    };
    fetchVenues();
  }, [showToast]);

  const filteredVenues = venues.filter(v => !v.sport || v.sport === form.sport);
  const selectedVenue = venues.find(v => v.id === form.venueId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { showToast('Войдите в аккаунт', 'error'); return; }
    if (!selectedVenue) { showToast('Выберите клуб', 'error'); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, 'matches'), {
        authorId: profile.uid,
        sport: form.sport,
        city: selectedVenue.city.trim(),
        venue: selectedVenue.name.trim(),
        district: selectedVenue.district.trim(),
        startDate: Timestamp.fromDate(form.startDate),
        level: form.level,
        openSpots: form.openSpots,
        totalSpots: form.openSpots + 1,
        hostName: profile.displayName,
        hostRating: profile.rating,
        hostNTRP: form.sport === 'tennis' ? profile.ntrp : null,
        note: form.note.trim(),
        tennisType: form.sport === 'tennis' ? form.tennisType : null,
        ntrpRange: null,
        latitude: selectedVenue.latitude,
        longitude: selectedVenue.longitude,
        participants: [profile.uid],
        createdAt: Timestamp.now(),
      });

      showToast('Заявка создана!', 'success');
      setForm(f => ({ ...f, venueId: '', note: '' }));
    } catch (error) {
      showToast('Ошибка при создании', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center pb-24">
        <div className="text-center px-4">
          <div className="text-4xl mb-3">🔐</div>
          <p className="text-lg font-medium">Войдите, чтобы создать заявку</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-6">
      <h1 className="text-2xl font-bold">Новая заявка</h1>

      <div className="card p-4 space-y-4">
        <h3 className="font-semibold text-lg">Спорт</h3>
        <div className="flex gap-2 overflow-x-auto pb-2" role="radiogroup">
          {(['padel', 'tennis', 'badminton', 'squash', 'football', 'running'] as Sport[]).map(sport => (
            <label key={sport} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-colors ${
              form.sport === sport
                ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="sport"
                value={sport}
                checked={form.sport === sport}
                onChange={() => setForm(f => ({ ...f, sport, venueId: '' }))}
                className="sr-only"
              />
              <span className="text-2xl">{sportIcons[sport]}</span>
              <span className="font-medium">{sportNames[sport]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <h3 className="font-semibold text-lg">Место</h3>
        {venuesLoading ? (
          <div className="text-center py-4 text-gray-500">Загрузка клубов...</div>
        ) : filteredVenues.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="font-medium">Нет клубов</p>
            <p className="text-sm mt-1">Клубы добавляются через «Модерация» → «Клубы»</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Клуб *</label>
              <select
                value={form.venueId}
                onChange={e => setForm(f => ({ ...f, venueId: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Выберите клуб</option>
                {filteredVenues.map(v => (
                  <option key={v.id} value={v.id}>{v.name} — {v.city}{v.district ? `, ${v.district}` : ''}</option>
                ))}
              </select>
            </div>

            {selectedVenue && (selectedVenue.latitude !== 0 || selectedVenue.longitude !== 0) && (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedVenue.longitude - 0.01}%2C${selectedVenue.latitude - 0.005}%2C${selectedVenue.longitude + 0.01}%2C${selectedVenue.latitude + 0.005}&layer=mapnik&marker=${selectedVenue.latitude}%2C${selectedVenue.longitude}`}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Дата и время *</label>
              <input
                type="datetime-local"
                value={form.startDate.toISOString().slice(0, 16)}
                onChange={e => setForm(f => ({ ...f, startDate: new Date(e.target.value) }))}
                className="input-field"
                required
              />
            </div>
          </div>
        )}
      </div>

      <div className="card p-4 space-y-4">
        <h3 className="font-semibold text-lg">Уровень и места</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Уровень</label>
            <select
              value={form.level}
              onChange={e => setForm(f => ({ ...f, level: e.target.value as SkillLevel }))}
              className="input-field"
            >
              {(['any', 'beginner', 'middle', 'advanced'] as SkillLevel[]).map(l => (
                <option key={l} value={l}>{levelNames[l]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Свободных мест</label>
            <input
              type="number"
              min="1"
              max="20"
              value={form.openSpots}
              onChange={e => setForm(f => ({ ...f, openSpots: parseInt(e.target.value) || 1 }))}
              className="input-field"
            />
          </div>
        </div>

        {form.sport === 'tennis' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Формат</label>
            <select
              value={form.tennisType}
              onChange={e => setForm(f => ({ ...f, tennisType: e.target.value as 'singles' | 'doubles' }))}
              className="input-field"
            >
              <option value="singles">Одиночный</option>
              <option value="doubles">Парный</option>
            </select>
          </div>
        )}
      </div>

      <div className="card p-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">Комментарий (необязательно)</label>
        <textarea
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          rows={3}
          placeholder="Дополнительная информация..."
          className="input-field resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !form.venueId}
        className="btn-primary w-full py-4 text-lg disabled:opacity-50"
      >
        {loading ? 'Создание...' : 'Создать заявку'}
      </button>
    </form>
  );
}
