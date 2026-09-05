'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { MatchesTab } from '@/components/tabs/MatchesTab';
import { CreateMatchTab } from '@/components/tabs/CreateMatchTab';
import { TournamentsTab } from '@/components/tabs/TournamentsTab';
import { ModerationTab } from '@/components/tabs/ModerationTab';
import { ProfileTab } from '@/components/tabs/ProfileTab';
import { ToastProvider } from '@/components/ui/Toast';

type Tab = 'matches' | 'create' | 'tournaments' | 'moderation' | 'profile';

const tabConfig: { id: Tab; label: string; icon: string }[] = [
  { id: 'matches', label: 'Матчи', icon: '🏟️' },
  { id: 'create', label: 'Заявка', icon: '➕' },
  { id: 'tournaments', label: 'Турниры', icon: '🏆' },
  { id: 'moderation', label: 'Модерация', icon: '🛡️' },
  { id: 'profile', label: 'Профиль', icon: '👤' },
];

export default function HomePage() {
  const { user, profile, loading, isStaff, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('matches');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pairly-bg">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo-white.png"
            alt="Pairly"
            width={1024}
            height={1024}
            className="h-14 w-auto animate-pulse-slow"
          />
          <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
            <div className="h-full animate-shimmer" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredTabs = tabConfig.filter(t => {
    if (t.id === 'moderation') return isStaff;
    return true;
  });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen pairly-bg">
      <div className="relative min-h-screen flex flex-col">
        <ToastProvider>
          <header
            className="z-[var(--z-header)] glass border-b border-[var(--color-border)]"
            style={{ position: 'sticky', top: 0 }}
          >
            <div className="flex items-center justify-between gap-3 px-4 h-14">
              <div className="flex items-center gap-2.5 min-w-0">
                <Image
                  src="/logo-white.png"
                  alt="Pairly"
                  width={1024}
                  height={1024}
                  className="h-8 w-auto shrink-0"
                />
                <span className="hidden sm:block text-sm font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  Pairly
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {profile && (
                  <div className="hidden md:flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
                    >
                      {profile.displayName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-sm max-w-[120px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {profile.displayName}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="btn btn-ghost btn-sm"
                  title="Выйти"
                >
                  Выйти
                </button>
              </div>
            </div>

            <nav
              className="hidden md:flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide"
              role="tablist"
              aria-label="Разделы приложения"
            >
              {filteredTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]'
                      : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </header>

          <main className="flex-1 overflow-hidden">
            <div className={activeTab === 'matches' ? 'h-full' : 'hidden'}>
              <MatchesTab onNavigate={(tab) => setActiveTab(tab as Tab)} />
            </div>
            <div className={activeTab === 'create' ? 'h-full' : 'hidden'}>
              <CreateMatchTab />
            </div>
            <div className={activeTab === 'tournaments' ? 'h-full' : 'hidden'}>
              <TournamentsTab />
            </div>
            {isStaff && (
              <div className={activeTab === 'moderation' ? 'h-full' : 'hidden'}>
                <ModerationTab />
              </div>
            )}
            <div className={activeTab === 'profile' ? 'h-full' : 'hidden'}>
              <ProfileTab />
            </div>
          </main>

          <nav
            className="fixed bottom-0 left-0 right-0 w-full border-t border-[var(--color-border)] safe-bottom z-[var(--z-header)] md:hidden glass"
            role="navigation"
            aria-label="Основная навигация"
          >
            <div className="flex gap-0.5 px-1 py-1.5" role="tablist" aria-label="Разделы приложения">
              {filteredTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                      : 'text-[var(--color-text-tertiary)] active:bg-[var(--color-surface-hover)]'
                    }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  <span className="text-xl leading-none" aria-hidden="true">{tab.icon}</span>
                  <span className="text-[10px] font-semibold leading-tight">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </ToastProvider>
      </div>
    </div>
  );
}
