'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { TournamentsTab } from '@/components/tabs/TournamentsTab';

export default function TournamentsPage() {
  return (
    <MainLayout>
      <TournamentsTab />
    </MainLayout>
  );
}
