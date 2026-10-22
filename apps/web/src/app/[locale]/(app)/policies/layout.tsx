'use client';

import type { ReactNode } from 'react';
import { ListSkeleton } from '@/components/app/page-parts';
import { AppShell } from '@/components/kavach/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { CountryProvider } from '@/lib/country';
import { useHousehold } from '@/lib/household';
import { useMarketSync } from '@/lib/market-sync';

export default function PoliciesLayout({ children }: { children: ReactNode }) {
  const { data: household } = useHousehold();
  // A language of the other market moves the demo family there first (zh/ms → Singapore);
  // until it has, the other market's policies (and currency) must not show.
  const switching = useMarketSync(household);
  return (
    <CountryProvider country={household?.country}>
      <AppShell householdName={household?.name}>
        {switching ? (
          <div className="flex flex-col gap-6" aria-busy>
            <Skeleton className="h-10 w-1/2" />
            <ListSkeleton rows={2} rowClassName="h-56" />
          </div>
        ) : (
          children
        )}
      </AppShell>
    </CountryProvider>
  );
}
