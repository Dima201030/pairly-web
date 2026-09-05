'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { CreateMatchTab } from '@/components/tabs/CreateMatchTab';

export default function CreatePage() {
  return (
    <MainLayout>
      <CreateMatchTab />
    </MainLayout>
  );
}
