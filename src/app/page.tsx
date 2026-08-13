'use client';

import { useState, useEffect } from 'react';
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
  const { user, loading, isStaff } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('matches');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-pulse-slow brand-gradient-text text-3xl font-bold">Pairly</div>
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

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <ToastProvider>
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
        
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] safe-bottom z-50" role="navigation" aria-label="Основная навигация">
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
  );
}