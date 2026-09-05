'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Sidebar } from '@/components/ui/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';

export function MainLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  return (
    <div className="min-h-screen pairly-bg">
      <div className="relative min-h-screen flex flex-col">
        <ToastProvider>
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

          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex flex-1 min-h-0">
            <DesktopSidebar />
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </ToastProvider>
      </div>
    </div>
  );
}

function DesktopSidebar() {
  const { profile, isStaff, logout } = useAuth();

  const NAV_ITEMS = [
    { href: '/', label: 'Матчи' },
    { href: '/create', label: 'Новая заявка' },
    { href: '/tournaments', label: 'Турниры' },
    { href: '/support', label: 'Поддержка' },
    { href: '/profile', label: 'Профиль' },
  ];

  const STAFF_ITEMS = [
    { href: '/moderation', label: 'Модерация' },
  ];

  const items = isStaff ? [...NAV_ITEMS, ...STAFF_ITEMS] : NAV_ITEMS;

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
        {items.map(item => (
          <a
            key={item.href}
            href={item.href}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
          >
            {item.label}
          </a>
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
