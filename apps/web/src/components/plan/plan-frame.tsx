'use client';

import type { Household } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { QueryError } from '@/components/app/page-parts';
import { AppShell } from '@/components/kavach/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { CountryProvider } from '@/lib/country';
import { useHousehold } from '@/lib/household';
import { useMarketSync } from '@/lib/market-sync';

/** App shell + the household, with loading and error states, for every moment-1 screen. */
export function PlanFrame({ children }: { children: (household: Household) => ReactNode }) {
  const t = useTranslations('plan');
  const { data: household, error, refetch } = useHousehold();
  // A language of the other market moves the demo family there first (zh/ms → Singapore).
  const switching = useMarketSync(household);
  return (
    <CountryProvider country={household?.country}>
      <AppShell householdName={household?.name}>
        {error ? (
          <QueryError message={t('error')} retryLabel={t('retry')} onRetry={() => refetch()} />
        ) : household && !switching ? (
          children(household)
        ) : (
          <div aria-busy className="flex flex-col gap-4" aria-label={t('loading')}>
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-28" />
            <Skeleton className="h-72" />
          </div>
        )}
      </AppShell>
    </CountryProvider>
  );
}
