'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { sportNames, levelNames } from '@/lib/theme';
import { Sport, SkillLevel, SavedVenue } from '@/lib/types';
import { collection, doc, setDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmptyState } from '@/components/ui/EmptyState';
import { YandexMap } from '@/components/ui/YandexMap';

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
      const matchId = crypto.randomUUID();
      await setDoc(doc(db, 'matches', matchId), {
        id: matchId,
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
      <div className="flex-1 flex items-center justify-center pb-24 md:pb-6">
        <div className="text-center px-4 animate-in">
          <p className="text-base font-medium" style={{ color: 'var(--color-text-secondary)' }}>Войдите, чтобы создать заявку</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-24 md:pb-6 px-3 sm:px-4 pt-5 space-y-4 animate-in max-w-2xl mx-auto">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Новая заявка</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Опишите игру — и игроки смогут записаться</p>
      </div>

      <Section title="Спорт">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="radiogroup">
          {(['padel', 'tennis', 'badminton', 'squash', 'football', 'running'] as Sport[]).map(sport => (
            <label
              key={sport}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border cursor-pointer transition-all press-scale shrink-0 ${
                form.sport === sport
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
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
              <span className="text-xs sm:text-sm font-medium">{sportNames[sport]}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Место">
        {venuesLoading ? (
          <div className="text-center py-6 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Загрузка клубов...</div>
        ) : filteredVenues.length === 0 ? (
          <EmptyState
            icon=""
            title="Нет клубов для этого спорта"
            description="Клубы добавляются через «Модерация» → «Клубы»"
            variant="compact"
          />
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="venue">Клуб</label>
              <select
                id="venue"
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
              <div className="rounded-xl overflow-hidden">
                <YandexMap lat={selectedVenue.latitude} lng={selectedVenue.longitude} height={120} />
              </div>
            )}

            <div>
              <label className="label" htmlFor="startDate">Дата и время</label>
              <input
                id="startDate"
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

      <Section title="Уровень и места">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div>
            <label className="label" htmlFor="level">Уровень</label>
            <select
              id="level"
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
            <label className="label" htmlFor="openSpots">Свободных мест</label>
            <input
              id="openSpots"
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
            <label className="label" htmlFor="tennisType">Формат</label>
            <select
              id="tennisType"
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

      <Section title="Комментарий">
        <textarea
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          rows={3}
          placeholder="Дополнительная информация (необязательно)"
          className="input-field resize-none"
        />
      </Section>

      <button
        type="submit"
        disabled={loading || !form.venueId}
        className="btn btn-primary btn-full py-3.5"
      >
        {loading ? 'Создание...' : 'Создать заявку'}
      </button>
    </form>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="card p-3 sm:p-4 space-y-2.5 sm:space-y-3">
      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
