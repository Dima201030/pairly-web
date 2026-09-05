'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import { Sidebar } from '@/components/ui/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import { CookieConsent } from '@/components/ui/CookieConsent';
import { MatchesTab } from '@/components/tabs/MatchesTab';
import { CreateMatchTab } from '@/components/tabs/CreateMatchTab';
import { TournamentsTab } from '@/components/tabs/TournamentsTab';
import { ModerationTab } from '@/components/tabs/ModerationTab';
import { ProfileTab } from '@/components/tabs/ProfileTab';
import { SupportChatPanel } from '@/components/panels/SupportChatPanel';

type Page = 'matches' | 'create' | 'tournaments' | 'moderation' | 'profile' | 'support';

const PAGE_MAP: Record<string, Page> = {
  '': 'matches',
  'create': 'create',
  'tournaments': 'tournaments',
  'moderation': 'moderation',
  'profile': 'profile',
  'support': 'support',
};

function getPageFromHash(): Page {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  return PAGE_MAP[hash] || 'matches';
}

export default function HomePage() {
  const { user, loading, isStaff } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState<Page>('matches');
  const [pageKey, setPageKey] = useState(0);

  const navigate = useCallback((page: Page) => {
    setActivePage(page);
    setPageKey(k => k + 1);
    window.location.hash = page === 'matches' ? '' : `/${page}`;
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const page = getPageFromHash();
      setActivePage(page);
      setPageKey(k => k + 1);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      window.location.replace('/login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pairly-bg">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo-mark.png"
            alt="Pairly"
            width={128}
            height={128}
            className="h-14 w-auto animate-pulse-slow rounded-2xl"
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

  const renderPage = () => {
    switch (activePage) {
      case 'create':
        return <CreateMatchTab />;
      case 'tournaments':
        return <TournamentsTab />;
      case 'moderation':
        return isStaff ? <ModerationTab /> : <MatchesTab />;
      case 'profile':
        return <ProfileTab />;
      case 'support':
        return (
          <div className="flex-1 overflow-y-auto pb-24 md:pb-10 pt-5 px-3 sm:px-4 max-w-2xl mx-auto">
            <SupportChatPanel mode="user" />
          </div>
        );
      default:
        return <MatchesTab onNavigate={(p) => navigate(p as Page)} />;
    }
  };

  return (
    <div className="min-h-screen pairly-bg">
      <div className="relative min-h-screen flex flex-col">
        <ToastProvider>
          <CookieConsent />
          <header
            className="z-[var(--z-header)] glass border-b border-[var(--color-border)] md:hidden"
            style={{ position: 'sticky', top: 0 }}
          >
            <div className="flex items-center gap-3 px-4 h-14">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors"
                aria-label="Открыть меню"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--color-text-primary)' }}>
                  <path d="M3 6h14M3 10h14M3 14h14" />
                </svg>
              </button>
              <Image
                src="/logo-mark.png"
                alt="Pairly"
                width={128}
                height={128}
                className="h-8 w-8 rounded-lg shrink-0"
              />
              <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Pairly
              </span>
            </div>
          </header>

          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage={activePage} onNavigate={navigate} />

          <div className="flex flex-1 min-h-0">
            <DesktopSidebar activePage={activePage} onNavigate={navigate} />
            <main className="flex-1 overflow-hidden">
              <div key={pageKey} className="h-full animate-in">
                {renderPage()}
              </div>
            </main>
          </div>
        </ToastProvider>
      </div>
    </div>
  );
}

function DesktopSidebar({ activePage, onNavigate }: { activePage: Page; onNavigate: (p: Page) => void }) {
  const { profile, isStaff, logout } = useAuth();

  const NAV_ITEMS: { id: Page; label: string }[] = [
    { id: 'matches', label: 'Матчи' },
    { id: 'create', label: 'Новая заявка' },
    { id: 'tournaments', label: 'Турниры' },
    { id: 'support', label: 'Поддержка' },
    { id: 'profile', label: 'Профиль' },
  ];

  if (isStaff) {
    NAV_ITEMS.splice(3, 0, { id: 'moderation', label: 'Модерация' });
  }

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-[var(--color-border)]"
      style={{ background: 'var(--color-bg)' }}
      aria-label="Навигация"
    >
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--color-border)]">
        <Image
          src="/logo-mark.png"
          alt="Pairly"
          width={128}
          height={128}
          className="h-8 w-8 rounded-lg"
        />
        <span className="text-base font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          Pairly
        </span>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activePage === item.id
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--color-border)]">
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
            >
              {profile.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {profile.displayName}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                {profile.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 text-[var(--color-text-secondary)] hover:text-[var(--color-negative)] hover:bg-[var(--color-surface-hover)]"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
