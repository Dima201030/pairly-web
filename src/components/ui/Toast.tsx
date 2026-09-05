'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed top-4 left-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none mx-auto max-w-3xl"
        role="status"
        aria-live="polite"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] animate-slide-up ${
              toast.type === 'error'
                ? 'text-white'
                : toast.type === 'success'
                  ? 'text-[var(--color-accent-on)]'
                  : 'text-[var(--color-text-primary)]'
            }`}
            style={{
              background: toast.type === 'error'
                ? 'var(--color-negative)'
                : toast.type === 'success'
                  ? 'var(--color-positive)'
                  : 'var(--color-surface-elevated)',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
