import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  Policy,
  type Citation,
  type DocExtraction,
  type DocumentRecord,
  type Household,
} from '@kavach/schemas';
import { readDocument } from '../agents/doc-reader';
import { env } from '../env';
import { blobs } from '../lib/blobs';
import { clauseId, getClause, productKeyFor } from '../retrieval/clauses';
import { store } from '../store';

const documentsOf = (householdId: string) => `households/${householdId}/documents`;

export async function listDocuments(householdId: string) {
  const documents = await store.list<DocumentRecord>(documentsOf(householdId));
  return documents.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getDocument(householdId: string, documentId: string) {
  const document = await store.get<DocumentRecord>(documentsOf(householdId), documentId);
  if (!document) throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  return document;
}

/** Stores the file, records the document and starts reading it in the background. */
export async function addDocument(
  household: Household,
  file: { filename: string; mimeType: string; bytes: Buffer; isSample?: boolean },
) {
  const id = `doc_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const safeName = file.filename.replace(/[^\w.-]+/g, '_');
  const now = new Date().toISOString();
  const document: DocumentRecord = {
    id,
    householdId: household.id,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.bytes.length,
    storagePath: `households/${household.id}/uploads/${id}/${safeName}`,
    kind: 'other',
    status: 'uploaded',
    progress: { step: 'queued', done: 0, total: 1 },
    pageCount: countPages(file),
    isSample: file.isSample ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await blobs.put(document.storagePath, file.bytes, file.mimeType);
  await store.set(documentsOf(household.id), id, document);

  void readInBackground(household, document, file.bytes);
  return document;
}

async function readInBackground(household: Household, document: DocumentRecord, bytes: Buffer) {
  const update = (patch: Partial<DocumentRecord>) =>
    store.update(documentsOf(household.id), document.id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  const pages = document.pageCount ?? 1;
  try {
    await update({ status: 'reading', progress: { step: 'reading_pages', done: 0, total: pages } });
    const raw = await readDocument({
      documentId: document.id,
      filename: document.filename,
      mimeType: document.mimeType,
      bytes,
      members: household.members,
    });
    // Recorded answers are instant; pace the steps so the progress list reads like real work.
    if (env.FAKE_LLM) {
      for (let done = 1; done <= pages; done++) {
        await sleep(500);
        await update({ progress: { step: 'reading_pages', done, total: pages } });
      }
    }
    await update({ progress: { step: 'matching_family', done: 0, total: 1 } });
    const extraction = await finishExtraction(raw, document.id, household);
    await update({ progress: { step: 'linking_clauses', done: 1, total: 1 } });
    if (env.FAKE_LLM) await sleep(400);
    await update({
      status: 'read',
      kind: extraction.kind,
      extraction,
      progress: { step: 'done', done: 1, total: 1 },
    });
  } catch (error) {
    await update({ status: 'failed', error: (error as Error).message });
  }
}

/** Points every citation at the stored document and its library clause, and matches insured persons to members. */
async function finishExtraction(raw: DocExtraction, documentId: string, household: Household) {
  const productKey = raw.policy && productKeyFor(raw.policy);
  const link = async (citation: Citation): Promise<Citation> => {
    const id = productKey && citation.clauseRef && clauseId(productKey, citation.clauseRef);
    const clause = id ? await getClause(id) : undefined;
    return { ...citation, documentId, ...(clause && { clauseId: clause.id }) };
  };

  const extraction = structuredClone(raw);
  extraction.documentId = documentId;
  extraction.citations = await Promise.all(raw.citations.map(link));
  if (extraction.policy) {
    const entries = Object.entries(extraction.policy.terms.citations);
    extraction.policy.terms.citations = Object.fromEntries(
      await Promise.all(entries.map(async ([key, c]) => [key, await link(c)] as const)),
    );
  }
  extraction.insuredPersons = raw.insuredPersons.map((person) => ({
    ...person,
    memberId: matchMember(household, person)?.id,
  }));
  return extraction;
}

function matchMember(household: Household, person: { name: string; age?: number }) {
  const first = person.name.toLowerCase().split(/\s+/)[0];
  const byName = household.members.filter((m) => m.name.toLowerCase().split(/\s+/)[0] === first);
  return byName.length === 1 ? byName[0] : byName.find((m) => m.age === person.age);
}

/**
 * Adds the document's policy to the household, or updates the policy it describes
 * (same UIN or policy number; else same kind and employer, or same kind, start date and members).
 */
export async function confirmDocument(household: Household, document: DocumentRecord) {
  const draft = document.extraction?.policy;
  if (document.status !== 'read' || !draft) {
    throw Object.assign(new Error('This document has no policy to confirm'), { statusCode: 409 });
  }
  const holder = household.members.find((m) => m.relation === 'self') ?? household.members[0];
  if (!holder) throw Object.assign(new Error('Household has no members'), { statusCode: 409 });
  const matched = document.extraction!.insuredPersons.flatMap((p) => p.memberId ?? []);
  const covered = matched.length ? [...new Set(matched)] : [holder.id];

  const existing = findExisting(household.policies, draft, covered);
  const policy = Policy.parse({
    ...existing,
    ...draft,
    id: existing?.id ?? `pol_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
    holderMemberId: existing?.holderMemberId ?? holder.id,
    coveredMemberIds: covered,
    documentIds: [...new Set([...(existing?.documentIds ?? []), document.id])],
  });
  const policies = existing
    ? household.policies.map((p) => (p.id === existing.id ? policy : p))
    : [...household.policies, policy];

  await store.update('households', household.id, { policies });
  await store.update(documentsOf(household.id), document.id, {
    confirmedPolicyId: policy.id,
    updatedAt: new Date().toISOString(),
  });
  return { policyId: policy.id, created: !existing };
}

function findExisting(policies: Policy[], draft: Partial<Policy>, covered: string[]) {
  return (
    policies.find(
      (p) =>
        (draft.uin && p.uin === draft.uin) ||
        (draft.policyNumber && p.policyNumber === draft.policyNumber),
    ) ??
    policies.find((p) => {
      if (p.kind !== draft.kind) return false;
      if (draft.source === 'employer') return sameEmployer(p.employer, draft.employer);
      return (
        p.startDate === draft.startDate && covered.every((m) => p.coveredMemberIds.includes(m))
      );
    })
  );
}

function sameEmployer(a?: string, b?: string) {
  const clean = (s?: string) =>
    (s ?? '')
      .toLowerCase()
      .replace(/\b(pvt|private|ltd|limited|llp|inc)\b|[^a-z0-9 ]/g, '')
      .trim();
  const [x, y] = [clean(a), clean(b)];
  return Boolean(x && y && (x.startsWith(y) || y.startsWith(x)));
}

/** Page count for the progress steps: PDF page objects, or 1 for an image. */
function countPages(file: { mimeType: string; bytes: Buffer }) {
  if (file.mimeType !== 'application/pdf') return 1;
  const pages = file.bytes.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length;
  return pages || undefined;
}
