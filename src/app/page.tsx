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

const tabConfig: { id: Tab; label: string; icon: string; href?: string }[] = [
  { id: 'matches', label: 'Матчи', icon: '🏟️' },
  { id: 'create', label: 'Заявка', icon: '➕' },
  { id: 'tournaments', label: 'Турниры', icon: '🏆' },
  { id: 'moderation', label: 'Модерация', icon: '🛡️' },
  { id: 'profile', label: 'Профиль', icon: '👤' },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('matches');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const visibleTabs = tabConfig.filter(t => {
    // We'll check isStaff inside the component via useAuth
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-pulse-slow text-[var(--color-brand)] text-2xl">Pairly</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Need isStaff for moderation tab visibility
  const { isStaff } = useAuth();

  const filteredTabs = tabConfig.filter(t => {
    if (t.id === 'moderation') return isStaff;
    return true;
  });

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
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <ToastProvider>
        <main className="flex-1 overflow-hidden">
          {renderTab()}
        </main>
        
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] safe-area-bottom z-50" role="navigation" aria-label="Основная навигация">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {filteredTabs.map((tab) => (
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