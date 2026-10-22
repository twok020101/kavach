'use client';

import { Household, type Locale } from '@kavach/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { getIdToken } from './firebase';
import { householdQueryKey } from './household';
import { marketForLocale, PERSONA_FOR_MARKET } from './market';
import { rememberMemberId } from './session';

/**
 * Keeps a demo household in the market the language implies: Mandarin or Malay moves the demo
 * to the Tan family in Singapore (S$, MediShield Life, Shield plans), Hindi back to the Sharmas
 * in India. English and Tamil keep whichever family is showing. A real household never moves.
 * Returns true while the switch is in flight, so screens can hold their skeleton.
 */
export function useMarketSync(household: Household | undefined): boolean {
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);
  // One attempt per household and target market, so a failed reset never loops.
  const tried = useRef<string | undefined>(undefined);

  const target = marketForLocale(locale);
  const needed = !!household?.isDemo && !!target && household.country !== target;

  useEffect(() => {
    if (!needed || !household || !target) return;
    const key = `${household.id}:${target}`;
    if (tried.current === key) return;
    tried.current = key;
    setSwitching(true);
    void (async () => {
      try {
        const next = await api(`/v1/households/${household.id}/demo:reset`, Household, {
          method: 'POST',
          json: { checkpoint: 'hospital', persona: PERSONA_FOR_MARKET[target] },
          token: await getIdToken(),
        });
        // The member home belonged to the other family.
        rememberMemberId(undefined);
        queryClient.setQueryData(householdQueryKey, next);
        await queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] !== householdQueryKey[0],
        });
      } finally {
        setSwitching(false);
      }
    })();
  }, [needed, household, target, queryClient]);

  return needed || switching;
}
