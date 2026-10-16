'use client';

import { Clause, ConfirmDocumentResponse, DocumentList, DocumentRecord } from '@kavach/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, apiUrl } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';
import { householdQueryKey } from '@/lib/household';

const documentsKey = (householdId?: string) => ['documents', householdId] as const;
const isReading = (d: DocumentRecord) => d.status === 'uploaded' || d.status === 'reading';

/** The household's documents, polled while any is still being read. */
export function useDocuments(householdId: string | undefined) {
  return useQuery({
    queryKey: documentsKey(householdId),
    enabled: Boolean(householdId),
    queryFn: async () =>
      (
        await api(`/v1/households/${householdId}/documents`, DocumentList, {
          token: await getIdToken(),
        })
      ).documents,
    refetchInterval: (query) => (query.state.data?.some(isReading) ? 1000 : false),
  });
}

/** Uploads one file with progress (fetch can't report upload progress, so this uses XHR). */
async function uploadFile(householdId: string, file: File, onProgress: (percent: number) => void) {
  const token = await getIdToken();
  const form = new FormData();
  form.append('file', file);
  return new Promise<DocumentRecord>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiUrl}/v1/households/${householdId}/documents`);
    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => {
      if (xhr.status === 202) resolve(DocumentRecord.parse(JSON.parse(xhr.responseText)));
      else reject(new Error(xhr.responseText));
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(form);
  });
}

export type Upload = { name: string; percent: number; failed?: boolean };

export function useUploadDocuments(householdId: string | undefined) {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const set = (name: string, patch: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.name === name ? { ...u, ...patch } : u)));

  const upload = async (files: File[]) => {
    if (!householdId) return;
    setUploads((list) => [...list, ...files.map((f) => ({ name: f.name, percent: 0 }))]);
    await Promise.all(
      files.map(async (file) => {
        try {
          await uploadFile(householdId, file, (percent) => set(file.name, { percent }));
          setUploads((list) => list.filter((u) => u.name !== file.name));
        } catch {
          set(file.name, { failed: true });
        }
      }),
    );
    await queryClient.invalidateQueries({ queryKey: documentsKey(householdId) });
  };
  return { uploads, upload };
}

export function useAddSamples(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      api(`/v1/households/${householdId}/documents:samples`, DocumentList, {
        method: 'POST',
        token: await getIdToken(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsKey(householdId) }),
  });
}

export function useConfirmDocument(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) =>
      api(
        `/v1/households/${householdId}/documents/${documentId}:confirm`,
        ConfirmDocumentResponse,
        { method: 'POST', token: await getIdToken() },
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: documentsKey(householdId) }),
        queryClient.invalidateQueries({ queryKey: householdQueryKey }),
      ]),
  });
}

export function useClause(clauseId: string | undefined) {
  return useQuery({
    queryKey: ['clause', clauseId],
    enabled: Boolean(clauseId),
    staleTime: Infinity,
    queryFn: async () =>
      api(`/v1/clauses/${encodeURIComponent(clauseId!)}`, Clause, { token: await getIdToken() }),
  });
}

/**
 * Opens a household document in a new tab, at a page when given. The file needs
 * the sign-in token, so it is fetched here and opened as a blob URL.
 */
export async function openDocumentFile(householdId: string, documentId: string, page?: number) {
  const tab = window.open('', '_blank');
  const response = await fetch(`${apiUrl}/v1/households/${householdId}/documents/${documentId}/file`, {
    headers: await authHeader(),
  });
  if (!response.ok) {
    tab?.close();
    return;
  }
  const url = URL.createObjectURL(await response.blob());
  const target = page ? `${url}#page=${page}` : url;
  if (tab) tab.location.href = target;
  else window.location.href = target;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}
