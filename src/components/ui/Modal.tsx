'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

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
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center overflow-x-hidden animate-slide-up"
      style={{ background: 'rgba(0,0,0,0.7)' }}
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
        className={`border border-[var(--color-border)] shadow-[var(--shadow-modal)] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] w-full ${maxWidth} max-h-[94vh] overflow-y-auto overflow-x-hidden relative outline-none animate-slide-up`}
        style={{ background: 'var(--color-surface)' }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-[var(--color-border)]"
          style={{ background: 'var(--color-surface)', backdropFilter: 'blur(10px)' }}
        >
          <h2 className="font-bold text-base sm:text-lg truncate min-w-0">{title}</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm shrink-0"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className="p-3 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
