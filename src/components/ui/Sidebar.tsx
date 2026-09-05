'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

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

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
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

  const items = isStaff ? [...NAV_ITEMS, ...STAFF_ITEMS] : NAV_ITEMS;

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
        className={`fixed top-0 left-0 h-full z-[450] w-72 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden`}
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          background: 'var(--color-bg)',
          borderRight: '1px solid var(--color-border)',
        }}
        aria-label="Навигация"
        role="navigation"
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
            {items.map(item => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
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
