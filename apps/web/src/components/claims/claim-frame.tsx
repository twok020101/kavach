'use client';

import type { Household } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ListSkeleton, QueryError } from '@/components/app/page-parts';
import { AppShell } from '@/components/kavach/app-shell';
import { DisclaimerBar } from '@/components/kavach/disclaimer-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { CountryProvider } from '@/lib/country';
import { useHousehold } from '@/lib/household';
import { useMarketSync } from '@/lib/market-sync';

/** App shell + the household, with loading and error states, for the claim screens. */
export function ClaimFrame({ children }: { children: (household: Household) => ReactNode }) {
  const t = useTranslations('claim');
  const { data: household, error, refetch } = useHousehold();
  const switching = useMarketSync(household);
  return (
    <CountryProvider country={household?.country}>
      <AppShell householdName={household?.name}>
        {error ? (
          <QueryError message={t('error')} retryLabel={t('retry')} onRetry={() => refetch()} />
        ) : household && !switching ? (
          <>
            {children(household)}
            <DisclaimerBar kind="claims" className="mt-6 max-w-4xl" />
          </>
        ) : (
          <div className="flex max-w-4xl flex-col gap-6" aria-busy aria-label={t('loading')}>
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-48 rounded-lg" />
            <ListSkeleton rows={2} />
          </div>
        )}
      </AppShell>
    </CountryProvider>
  );
}
