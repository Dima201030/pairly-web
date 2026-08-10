'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { MatchesTab } from '@/components/tabs/MatchesTab';
import { CreateMatchTab } from '@/components/tabs/CreateMatchTab';
import { TournamentsTab } from '@/components/tabs/TournamentsTab';
import { ModerationTab } from '@/components/tabs/ModerationTab';
import { ProfileTab } from '@/components/tabs/ProfileTab';
import { ToastProvider } from '@/components/ui/Toast';

type Tab = 'matches' | 'create' | 'tournaments' | 'moderation' | 'profile';

const tabConfig: { id: Tab; label: string; icon: string; href?: string }[] = [
  { id: 'matches', label: 'Матчи', icon: '🏟️' },
  { id: 'create', label: 'Заявка', icon: '➕' },
  { id: 'tournaments', label: 'Турниры', icon: '🏆' },
  { id: 'moderation', label: 'Модерация', icon: '🛡️' },
  { id: 'profile', label: 'Профиль', icon: '👤' },
];

export default function HomePage() {
  const { isStaff, isModerator, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('matches');

  const visibleTabs = tabConfig.filter(t => {
    if (t.id === 'moderation') return isStaff;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse-slow text-[var(--color-brand)] text-2xl">Pairly</div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'matches': return <MatchesTab />;
      case 'create': return <CreateMatchTab />;
      case 'tournaments': return <TournamentsTab />;
      case 'moderation': return <ModerationTab />;
      case 'profile': return <ProfileTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ToastProvider>
        <main className="flex-1 overflow-hidden">
          {renderTab()}
        </main>
        
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom z-50" role="navigation" aria-label="Основная навигация">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200
                  ${activeTab === tab.id 
                    ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]' 
                    : 'text-gray-400 active:text-gray-600'}`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
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