'use client';

import {
  type ConsentPurpose,
  CreateInviteResponse,
  FamilyAccess,
  type Finances,
  Household,
  IntakeResult,
  InvitePreview,
  type Locale,
  type Member,
  SmartQuestion,
  type SmartQuestionId,
  Timeline,
} from '@kavach/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { z } from 'zod';
import { api, apiUrl } from './api';
import { getIdToken } from './firebase';
import { householdQueryKey } from './household';
import { marketForLocale } from './market';
import { rememberHouseholdId, rememberMemberId } from './session';

const call = async <S extends z.ZodType>(
  path: string,
  schema: S,
  init: Parameters<typeof api>[2] = {},
) => api(path, schema, { ...init, token: await getIdToken() });

/** A mutation that returns the updated household and puts it in the cache every screen reads. */
function useHouseholdMutation<V>(fn: (vars: V) => Promise<Household>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (household) => {
      queryClient.setQueryData(householdQueryKey, household);
      // Plans, questions and the timeline all follow from the household.
      return queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== householdQueryKey[0] && q.queryKey[0] !== 'intake',
      });
    },
  });
}

/** S03: creates the family's household with their consent, and makes it this browser's household. */
export function useCreateHousehold() {
  // A family setting up in Mandarin or Malay is a Singapore family (S$, Shield plans).
  const country = marketForLocale(useLocale() as Locale) ?? 'IN';
  return useHouseholdMutation(async (consents: ConsentPurpose[]) => {
    const household = await call('/v1/households', Household, {
      method: 'POST',
      json: { consents, country },
    });
    rememberHouseholdId(household.id);
    return household;
  });
}

// ------------------------------------------------------------------ S04 → S05 hand-off

const INTAKE_KEY = 'kavach.intake';

/** The people found on S04, kept for S05 (also across a reload). */
export function saveIntake(result: IntakeResult) {
  try {
    sessionStorage.setItem(INTAKE_KEY, JSON.stringify(result));
  } catch {
    // S05 then starts from the saved household instead.
  }
}

export function clearIntake() {
  try {
    sessionStorage.removeItem(INTAKE_KEY);
  } catch {
    // Nothing kept.
  }
}

export function loadIntake(): IntakeResult | undefined {
  try {
    const raw = sessionStorage.getItem(INTAKE_KEY);
    return raw ? IntakeResult.parse(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

export function useParseFamily(householdId: string | undefined) {
  return useMutation({
    mutationFn: (body: {
      text?: string;
      audio?: { mimeType: string; data: string };
      locale: Locale;
    }) =>
      call(`/v1/households/${householdId}/intake:parse`, IntakeResult, {
        method: 'POST',
        json: body,
      }),
  });
}

export type DraftMember = Omit<Member, 'id' | 'age'> & { id?: string; age: number | null };

export function useSetMembers(householdId: string | undefined) {
  return useHouseholdMutation(
    (body: { name: string; city?: string; members: (Omit<Member, 'id'> & { id?: string })[] }) =>
      call(`/v1/households/${householdId}/members`, Household, { method: 'PUT', json: body }),
  );
}

export function useSetFinances(householdId: string | undefined) {
  return useHouseholdMutation((finances: Finances) =>
    call(`/v1/households/${householdId}/finances`, Household, { method: 'PUT', json: finances }),
  );
}

// ------------------------------------------------------------------ S08

export function useQuestions(householdId: string | undefined) {
  return useQuery({
    queryKey: ['questions', householdId],
    queryFn: () => call(`/v1/households/${householdId}/questions`, z.array(SmartQuestion)),
    enabled: !!householdId,
    staleTime: Infinity,
  });
}

export function useAnswer(householdId: string | undefined) {
  return useHouseholdMutation((answers: Partial<Record<SmartQuestionId, string>>) =>
    call(`/v1/households/${householdId}/answers`, Household, {
      method: 'POST',
      json: { answers },
    }),
  );
}

// ------------------------------------------------------------------ S25, S27, S28

export function useTimeline(householdId: string | undefined) {
  return useQuery({
    queryKey: ['timeline', householdId],
    queryFn: () => call(`/v1/households/${householdId}/timeline`, Timeline),
    enabled: !!householdId,
  });
}

export function useSetConsents(householdId: string | undefined) {
  return useHouseholdMutation((consents: ConsentPurpose[]) =>
    call(`/v1/households/${householdId}/consents`, Household, {
      method: 'PUT',
      json: { consents },
    }),
  );
}

export function useDeleteHousehold(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      call(`/v1/households/${householdId}`, z.object({ deleted: z.literal(true) }), {
        method: 'DELETE',
      }),
    onSuccess: () => {
      rememberHouseholdId(undefined);
      queryClient.clear();
    },
  });
}

/** Downloads everything Kavach keeps about the household as a JSON file. */
export async function downloadExport(householdId: string) {
  const token = await getIdToken();
  const response = await fetch(`${apiUrl}/v1/households/${householdId}/export`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Export ${response.status}`);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(await response.blob());
  link.download = `kavach-${householdId}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function useAccess(householdId: string | undefined) {
  return useQuery({
    queryKey: ['access', householdId],
    queryFn: () => call(`/v1/households/${householdId}/access`, FamilyAccess),
    enabled: !!householdId,
  });
}

export function useCreateInvite(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { memberId: string; language: Locale; phone?: string }) =>
      call(`/v1/households/${householdId}/invites`, CreateInviteResponse, {
        method: 'POST',
        json: body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access', householdId] }),
  });
}

export function useRemoveAccess(householdId: string | undefined) {
  return useHouseholdMutation((uid: string) =>
    call(`/v1/households/${householdId}/access/${uid}`, Household, { method: 'DELETE' }),
  );
}

export function useSetAlertContact(householdId: string | undefined) {
  return useHouseholdMutation((memberId: string) =>
    call(`/v1/households/${householdId}/alert-contact`, Household, {
      method: 'PUT',
      json: { memberId },
    }),
  );
}

/** S02 with `?invite=`: who invited whom, before signing in. */
export function useInvitePreview(token: string | null) {
  return useQuery({
    queryKey: ['invite', token],
    queryFn: () => api(`/v1/public/invites/${token}`, InvitePreview),
    enabled: !!token,
    retry: false,
  });
}

export async function acceptInvite(token: string) {
  const { householdId, memberId } = await call(
    `/v1/invites/${token}/accept`,
    z.object({ householdId: z.string(), memberId: z.string() }),
    { method: 'POST', json: {} },
  );
  rememberHouseholdId(householdId);
  rememberMemberId(memberId);
  return householdId;
}
