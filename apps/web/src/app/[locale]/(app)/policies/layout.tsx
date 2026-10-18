'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/kavach/app-shell';
import { CountryProvider } from '@/lib/country';
import { useHousehold } from '@/lib/household';
import { useMarketSync } from '@/lib/market-sync';

export default function PoliciesLayout({ children }: { children: ReactNode }) {
  const { data: household } = useHousehold();
  // A language of the other market moves the demo family there first (zh/ms → Singapore).
  useMarketSync(household);
  return (
    <CountryProvider country={household?.country}>
      <AppShell householdName={household?.name}>{children}</AppShell>
    </CountryProvider>
  );
}
