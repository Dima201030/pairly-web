'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { SupportChatPanel } from '@/components/panels/SupportChatPanel';

export default function SupportPage() {
  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto pb-24 md:pb-10 pt-5 px-4 max-w-2xl mx-auto">
        <SupportChatPanel mode="user" onClose={() => {}} />
      </div>
    </MainLayout>
  );
}
