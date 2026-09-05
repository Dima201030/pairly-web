'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { ProfileTab } from '@/components/tabs/ProfileTab';

export default function ProfilePage() {
  return (
    <MainLayout>
      <ProfileTab />
    </MainLayout>
  );
}
