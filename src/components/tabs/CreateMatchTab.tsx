'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { sportNames, levelNames, sportIcons } from '@/lib/theme';
import { Sport, SkillLevel, SavedVenue } from '@/lib/types';
import { collection, addDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmptyState } from '@/components/ui/EmptyState';

const TWO_HOURS_FROM_NOW = Date.now() + 2 * 60 * 60 * 1000;

export function CreateMatchTab() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<SavedVenue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);

  const [form, setForm] = useState({
    sport: 'padel' as Sport,
    venueId: '',
    startDate: new Date(TWO_HOURS_FROM_NOW),
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
    } catch {
      showToast('Ошибка при создании', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center pb-24 md:pb-10">
        <div className="text-center px-4 animate-in">
          <div className="text-5xl mb-3">🔐</div>
          <p className="text-lg font-medium text-[var(--color-text-secondary)]">Войдите, чтобы создать заявку</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-24 md:pb-10 px-4 pt-4 space-y-5 animate-in max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="brand-gradient-text text-3xl font-extrabold tracking-tight">Новая заявка</h1>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">Опишите игру — и игроки смогут записаться</p>
      </div>

      <Section step="1" title="Спорт">
        <div className="flex gap-2 overflow-x-auto pb-2" role="radiogroup">
          {(['padel', 'tennis', 'badminton', 'squash', 'football', 'running'] as Sport[]).map(sport => (
            <label
              key={sport}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all press-scale ${
                form.sport === sport
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/10 shadow-[0_0_0_1px_var(--color-brand)]/20'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
              }`}
            >
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
      </Section>

      <Section step="2" title="Место">
        {venuesLoading ? (
          <div className="text-center py-6 text-[var(--color-text-tertiary)]">Загрузка клубов...</div>
        ) : filteredVenues.length === 0 ? (
          <EmptyState
            icon="🏟️"
            title="Нет клубов для этого спорта"
            description="Клубы добавляются через «Модерация» → «Клубы»"
            variant="compact"
          />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Клуб *</label>
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
              <MapPreview
                lat={selectedVenue.latitude}
                lng={selectedVenue.longitude}
                name={selectedVenue.name}
              />
            )}

            <div>
              <label className="label">Дата и время *</label>
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
      </Section>

      <Section step="3" title="Уровень и места">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Уровень</label>
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
            <label className="label">Свободных мест</label>
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
            <label className="label">Формат</label>
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
      </Section>

      <Section step="4" title="Комментарий (необязательно)">
        <textarea
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          rows={3}
          placeholder="Дополнительная информация..."
          className="input-field resize-none"
        />
      </Section>

      <button
        type="submit"
        disabled={loading || !form.venueId}
        className="btn btn-brand-gradient btn-full btn-lg press-scale"
      >
        {loading ? 'Создание...' : 'Создать заявку'}
      </button>
    </form>
  );
}

interface SectionProps {
  step: string;
  title: string;
  children: React.ReactNode;
}

function Section({ step, title, children }: SectionProps) {
  return (
    <div className="card p-5 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-divider)]" aria-hidden="true" />
      <div className="absolute top-0 left-0 h-0.5 brand-gradient w-16" aria-hidden="true" />
      <h3 className="font-semibold text-lg flex items-center gap-2.5">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)] text-sm font-bold flex items-center justify-center">
          {step}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

interface MapPreviewProps {
  lat: number;
  lng: number;
  name: string;
}

function MapPreview({ lat, lng, name }: MapPreviewProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--color-border)]">
      <iframe
        width="100%"
        height="200"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.005}%2C${lng + 0.01}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`}
        title={`Карта: ${name}`}
      />
    </div>
  );
}