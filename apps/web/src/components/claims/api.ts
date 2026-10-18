'use client';

import { ClaimCase, ClaimList, type AppealCheck } from '@kavach/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiUrl, ApiError } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';
import { householdQueryKey } from '@/lib/household';

const claimsKey = (hid?: string) => ['claims', hid] as const;
const claimKey = (hid?: string, cid?: string) => ['claim', hid, cid] as const;
const base = (hid: string) => `/v1/households/${hid}/claims`;

async function authHeader(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function useClaims(hid: string | undefined) {
  return useQuery({
    queryKey: claimsKey(hid),
    enabled: Boolean(hid),
    queryFn: async () => (await api(base(hid!), ClaimList, { token: await getIdToken() })).claims,
  });
}

export function useClaim(hid: string | undefined, cid: string) {
  return useQuery({
    queryKey: claimKey(hid, cid),
    enabled: Boolean(hid),
    queryFn: async () => api(`${base(hid!)}/${cid}`, ClaimCase, { token: await getIdToken() }),
  });
}

/** Writes a fresh claim into the cache so the next screen opens without a reload. */
function useStoreClaim(hid: string | undefined) {
  const queryClient = useQueryClient();
  return (claim: ClaimCase) => {
    queryClient.setQueryData(claimKey(hid, claim.id), claim);
    // A sample letter moves a demo family to its checkpoint, so the household may have changed.
    void queryClient.invalidateQueries({ queryKey: householdQueryKey });
    return queryClient.invalidateQueries({ queryKey: claimsKey(hid) });
  };
}

/** S30: reads an uploaded letter, or the sample letter when no file is given. */
export function useCreateClaim(hid: string | undefined) {
  const store = useStoreClaim(hid);
  return useMutation({
    mutationFn: async (file?: File | 'maternity') => {
      if (!file || file === 'maternity') {
        const scene = file === 'maternity' ? '?scene=maternity' : '';
        return api(`${base(hid!)}:sample${scene}`, ClaimCase, {
          method: 'POST',
          token: await getIdToken(),
        });
      }
      const form = new FormData();
      form.append('file', file);
      return api(base(hid!), ClaimCase, {
        method: 'POST',
        body: form,
        token: await getIdToken(),
      });
    },
    onSuccess: store,
  });
}

export function useAssess(hid: string | undefined, cid: string) {
  const store = useStoreClaim(hid);
  return useMutation({
    mutationFn: async (json: { roomRentPerDay?: number; icuStay?: boolean }) =>
      api(`${base(hid!)}/${cid}:assess`, ClaimCase, {
        method: 'POST',
        json,
        token: await getIdToken(),
      }),
    onSuccess: store,
  });
}

export function useDraftAppeal(hid: string | undefined, cid: string) {
  const store = useStoreClaim(hid);
  return useMutation({
    mutationFn: async () =>
      api(`${base(hid!)}/${cid}/appeal`, ClaimCase, {
        method: 'POST',
        token: await getIdToken(),
      }),
    onSuccess: store,
  });
}

export function useUpdateAppeal(hid: string | undefined, cid: string) {
  const store = useStoreClaim(hid);
  return useMutation({
    mutationFn: async (text: string) =>
      api(`${base(hid!)}/${cid}/appeal/text`, ClaimCase, {
        method: 'POST',
        json: { text },
        token: await getIdToken(),
      }),
    onSuccess: store,
  });
}

/** Downloads the verified appeal PDF. Rejects with the failed checks when the API refuses it. */
export async function downloadAppealPdf(hid: string, claim: ClaimCase) {
  const response = await fetch(`${apiUrl}${base(hid)}/${claim.id}/appeal/pdf`, {
    headers: await authHeader(),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { checks?: AppealCheck[] };
    throw new ApiError(response.status, body);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `appeal-${(claim.letter?.claimNumber ?? claim.id).replace(/[^\w-]+/g, '-')}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens the stored settlement letter in a new tab (it needs the sign-in token). */
export async function openLetter(hid: string, cid: string) {
  const tab = window.open('', '_blank');
  const response = await fetch(`${apiUrl}${base(hid)}/${cid}/letter`, {
    headers: await authHeader(),
  });
  if (!response.ok) return tab?.close();
  const url = URL.createObjectURL(await response.blob());
  if (tab) tab.location.href = url;
  else window.location.href = url;
}
