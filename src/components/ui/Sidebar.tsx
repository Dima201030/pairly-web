'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';

type Page = 'matches' | 'create' | 'tournaments' | 'moderation' | 'profile' | 'support';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ open, onClose, activePage, onNavigate }: SidebarProps) {
  const { profile, isStaff, logout } = useAuth();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

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
    <>
      <div
        className={`fixed inset-0 z-[400] bg-black/60 transition-opacity duration-300 md:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 left-0 h-full z-[450] w-72 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden`}
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          visibility: open ? 'visible' : 'hidden',
          background: 'var(--color-bg)',
          borderRight: '1px solid var(--color-border)',
        }}
        aria-label="Навигация"
        role="navigation"
        aria-hidden={!open}
      >
        <div className="flex flex-col h-full">
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
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 text-[var(--color-text-secondary)] hover:text-[var(--color-negative)] hover:bg-[var(--color-surface-hover)]"
            >
              Выйти
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
