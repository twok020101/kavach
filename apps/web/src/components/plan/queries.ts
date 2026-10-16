'use client';

import {
  Action,
  ChangeSet,
  LifeChangeRecord,
  Plan,
  PlanDiff,
  type Locale,
} from '@kavach/schemas';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api, apiUrl } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

const call = async <S extends z.ZodType>(path: string, schema: S, init: Parameters<typeof api>[2] = {}) =>
  api(path, schema, { ...init, token: await getIdToken() });

/** The plan as of a date (the household's today when asOf is undefined). */
export function usePlan(householdId: string | undefined, asOf?: string) {
  return useQuery({
    queryKey: ['plan', householdId, asOf ?? 'today'],
    queryFn: () =>
      call(
        `/v1/households/${householdId}/plans/current${asOf ? `?asOf=${asOf}` : ''}`,
        Plan,
      ),
    enabled: !!householdId,
    placeholderData: keepPreviousData,
  });
}

export function useParseChange(householdId: string | undefined) {
  return useMutation({
    mutationFn: ({ text, locale }: { text: string; locale: Locale }) =>
      call(`/v1/households/${householdId}/life-changes:parse`, ChangeSet, {
        method: 'POST',
        json: { text, locale },
      }),
  });
}

const RecordResponse = z.object({ id: z.string(), diff: PlanDiff, actions: z.array(Action) });

export function useRecordChange(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ changeSet, text }: { changeSet: ChangeSet; text?: string }) =>
      call(`/v1/households/${householdId}/life-changes`, RecordResponse, {
        method: 'POST',
        json: { changeSet, text },
      }),
    // The household's policies and every plan changed.
    onSuccess: () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'lifeChange' }),
  });
}

export function useLifeChange(householdId: string | undefined, id: string) {
  return useQuery({
    queryKey: ['lifeChange', householdId, id],
    queryFn: () => call(`/v1/households/${householdId}/life-changes/${id}`, LifeChangeRecord),
    enabled: !!householdId,
  });
}

export function useActions(householdId: string | undefined) {
  return useQuery({
    queryKey: ['actions', householdId],
    queryFn: () => call(`/v1/households/${householdId}/actions`, z.array(Action)),
    enabled: !!householdId,
  });
}

export function useAction(householdId: string | undefined, id: string) {
  return useQuery({
    queryKey: ['actions', householdId, id],
    queryFn: () => call(`/v1/households/${householdId}/actions/${id}`, Action),
    enabled: !!householdId,
  });
}

const DecideResponse = z.object({ action: Action, pdfUrl: z.string().optional() });

/** Approve (a letter becomes a PDF) or dismiss a drafted action. */
export function useDecideAction(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: 'approve' | 'dismiss' }) =>
      call(`/v1/households/${householdId}/actions/${id}:${verb}`, DecideResponse, {
        method: 'POST',
        json: {},
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actions', householdId] }),
  });
}

/** Opens an approved letter's PDF (fetched with the sign-in token, so it works with auth on). */
export async function openPdf(householdId: string, actionId: string) {
  const token = await getIdToken();
  const response = await fetch(`${apiUrl}/v1/households/${householdId}/actions/${actionId}/pdf`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`PDF ${response.status}`);
  const url = URL.createObjectURL(await response.blob());
  window.open(url, '_blank');
}

