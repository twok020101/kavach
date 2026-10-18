'use client';

import type { Household } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/kavach/app-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CountryProvider } from '@/lib/country';
import { useHousehold } from '@/lib/household';

/** App shell + the household, with loading and error states, for every moment-1 screen. */
export function PlanFrame({ children }: { children: (household: Household) => ReactNode }) {
  const t = useTranslations('plan');
  const { data: household, error, refetch } = useHousehold();
  return (
    <CountryProvider country={household?.country}>
      <AppShell householdName={household?.name}>
        {error ? (
          <div className="flex flex-col items-start gap-3">
            <p className="rounded-md bg-gap-bg p-4 text-gap">{t('error')}</p>
            <Button variant="secondary" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : household ? (
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
