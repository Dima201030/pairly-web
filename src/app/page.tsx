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
      <div className="min-h-screen pairly-bg flex items-center justify-center">
        <Image
          src="/logo-white.png"
          alt="Pairly"
          width={1024}
          height={1024}
          className="h-16 w-auto animate-pulse-slow"
        />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
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
      <div className="relative mx-auto w-full max-w-3xl min-h-screen bg-[var(--color-bg)] border-x border-[var(--color-border)] shadow-[0_0_60px_-15px_rgba(0,150,255,0.15)] flex flex-col">
        <ToastProvider>
          <header className="z-40 bg-[var(--color-surface)]/85 backdrop-blur border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between gap-3 px-4 h-16">
              <div className="flex items-center gap-3 min-w-0">
                <Image
                  src="/logo-white.png"
                  alt="Pairly"
                  width={1024}
                  height={1024}
                  className="h-10 w-auto shrink-0"
                />
                <div className="hidden sm:block min-w-0">
                  <p className="font-bold leading-tight truncate">Pairly</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] truncate">Найди игру</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden md:flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <span className="w-8 h-8 rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)] font-bold flex items-center justify-center">
                    {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="max-w-[140px] truncate">{profile?.displayName}</span>
                </span>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="Выйти">
                  Выйти
                </button>
              </div>
            </div>

            <nav
              className="hidden md:flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide"
              role="tablist"
              aria-label="Разделы приложения"
            >
              {filteredTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'brand-gradient text-[var(--color-text-on-brand)] shadow-md'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </header>

          <main className="flex-1 overflow-hidden">
            {/* Вкладки не размаунтируются при переключении (hidden вместо unmount) —
                данные и live-подписки продолжают жить в фоне, нет мигания лоадера. */}
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
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-3xl bg-[var(--color-surface)] border-t border-x border-[var(--color-border)] safe-bottom z-50 md:hidden"
            role="navigation"
            aria-label="Основная навигация"
          >
            <div className="flex gap-1 px-2 py-2" role="tablist" aria-label="Разделы приложения">
              {filteredTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200
                    ${activeTab === tab.id 
                      ? 'brand-gradient text-[var(--color-text-on-brand)] shadow-lg' 
                      : 'text-[var(--color-text-tertiary)]'}`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  <span className="text-2xl" aria-hidden="true">{tab.icon}</span>
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </ToastProvider>
      </div>
    </div>
  );
}