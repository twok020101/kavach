'use client';

import type { Household } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/kavach/app-shell';
import { DisclaimerBar } from '@/components/kavach/disclaimer-bar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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
          <div className="flex flex-col items-start gap-3">
            <p className="rounded-md bg-gap-bg p-4 text-gap">{t('error')}</p>
            <Button variant="secondary" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : household && !switching ? (
          <>
            {children(household)}
            <DisclaimerBar kind="claims" className="mt-6" />
          </>
        ) : (
          <p className="flex items-center gap-2 text-muted">
            <Spinner className="size-5" /> {t('loading')}
          </p>
        )}
      </AppShell>
    </CountryProvider>
  );
}
