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
      className="fixed bottom-0 left-0 right-0 z-[550] px-3 py-2 sm:p-4 md:p-6 overflow-x-hidden animate-slide-up safe-bottom"
      style={{ background: 'var(--color-surface-elevated)', borderTop: '1px solid var(--color-border)' }}
    >
      <div className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-4">
        <p className="text-xs sm:text-sm flex-1 min-w-0" style={{ color: 'var(--color-text-secondary)' }}>
          Cookie нужны для авторизации и настроек.
        </p>
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="btn btn-ghost btn-sm !text-xs sm:!text-sm"
          >
            Отклонить
          </button>
          <button
            onClick={handleAccept}
            className="btn btn-primary btn-sm !text-xs sm:!text-sm"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
