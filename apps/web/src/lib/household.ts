'use client';

import { DemoCheckpoint, Household, type Locale } from '@kavach/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import { getIdToken } from './firebase';
import { personaForLocale } from './market';
import { startDemo, storedHouseholdId } from './session';

export const householdQueryKey = ['household'] as const;

/** Loads the remembered household, or starts a demo when there is none (or it has gone). */
export async function loadCurrentHousehold(): Promise<Household> {
  const token = await getIdToken();
  const remembered = storedHouseholdId();
  if (remembered) {
    try {
      return await api(`/v1/households/${remembered}`, Household, { token });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }
  const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'en') as Locale;
  const householdId = await startDemo('hospital', personaForLocale(lang));
  return api(`/v1/households/${householdId}`, Household, { token });
}

/** The household the app is showing. Every screen reads it from here. */
export function useHousehold() {
  return useQuery({ queryKey: householdQueryKey, queryFn: loadCurrentHousehold });
}

/** Demo controls (S29): reset to a checkpoint, or move the demo clock. */
export function useDemoControls(householdId: string | undefined) {
  const queryClient = useQueryClient();
  const post = async (action: 'reset' | 'clock', json: object) =>
    api(`/v1/households/${householdId}/demo:${action}`, Household, {
      method: 'POST',
      json,
      token: await getIdToken(),
    });
  const onSuccess = (household: Household) => {
    queryClient.setQueryData(householdQueryKey, household);
    // Anything else the screens cached belongs to the old state.
    return queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== householdQueryKey[0],
    });
  };
  return {
    reset: useMutation({
      mutationFn: (checkpoint: DemoCheckpoint) => post('reset', { checkpoint }),
      onSuccess,
    }),
    setClock: useMutation({ mutationFn: (date: string) => post('clock', { date }), onSuccess }),
  };
}
