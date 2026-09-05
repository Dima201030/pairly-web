'use client';

import { useState } from 'react';

const COOKIE_KEY = 'pairly_cookie_consent';

function getInitialVisibility(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(COOKIE_KEY);
}

export function CookieConsent() {
  const [visible, setVisible] = useState(getInitialVisibility);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[550] p-3 sm:p-4 md:p-6 animate-slide-up"
      style={{ background: 'var(--color-surface-elevated)', borderTop: '1px solid var(--color-border)' }}
    >
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <p className="text-sm flex-1" style={{ color: 'var(--color-text-secondary)' }}>
          Мы используем cookie для хранения ваших настроек и авторизации. Без cookie приложение не сможет работать.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="btn btn-ghost btn-sm"
          >
            Отклонить
          </button>
          <button
            onClick={handleAccept}
            className="btn btn-primary btn-sm"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
