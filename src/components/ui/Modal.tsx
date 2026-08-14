'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

/**
 * Переиспользуемое модальное окно: на мобиле — нижний лист на весь экран,
 * на десктопе — центрированная карточка. Escape / клик по фону закрывают,
 * фокус замыкается внутри окна.
 */
export function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const els = Array.from(
        panel.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (els.length === 0) return;
      if (e.shiftKey && document.activeElement === els[0]) {
        e.preventDefault();
        els[els.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === els[els.length - 1]) {
        e.preventDefault();
        els[0].focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      prevFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-slide-up"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] rounded-t-2xl sm:rounded-2xl w-full ${maxWidth} max-h-[94vh] overflow-y-auto relative outline-none animate-slide-up`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 brand-gradient" aria-hidden="true" />
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-[var(--color-surface)]/90 backdrop-blur border-b border-[var(--color-divider)]">
          <h2 className="font-bold text-lg truncate">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}