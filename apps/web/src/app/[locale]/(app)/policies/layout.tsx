'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/kavach/app-shell';
import { useHousehold } from '@/lib/household';

export default function PoliciesLayout({ children }: { children: ReactNode }) {
  const { data: household } = useHousehold();
  return <AppShell householdName={household?.name}>{children}</AppShell>;
}
