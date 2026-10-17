import { randomUUID } from 'node:crypto';
import { assessClaim } from '@kavach/engine';
import {
  ClaimBill,
  type ClaimAppeal,
  type ClaimCase,
  type Household,
  type Policy,
  type SettlementLetter,
} from '@kavach/schemas';
import { draftAppeal } from '../agents/appeal-drafter';
import { readSettlementLetter } from '../agents/claim-letter-reader';
import { blobs } from '../lib/blobs';
import { listClauses } from '../retrieval/clauses';
import { store } from '../store';
import { citeDeductions, findProductKey } from './clauses';
import { renderAppealText } from './letter-text';
import { renderAppealPdf } from './pdf';
import { verifyAppeal } from './verify';

const claimsOf = (householdId: string) => `households/${householdId}/claimCases`;

const httpError = (statusCode: number, message: string, extra: object = {}) =>
  Object.assign(new Error(message), { statusCode, ...extra });

export type LetterFile = {
  filename: string;
  mimeType: string;
  bytes: Buffer;
  isSample?: boolean;
  /** With FAKE_LLM=1, which recorded reading to return. */
  fixture?: string;
};

export async function listClaims(householdId: string) {
  const claims = await store.list<ClaimCase>(claimsOf(householdId));
  return claims.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getClaim(householdId: string, claimId: string) {
  const claim = await store.get<ClaimCase>(claimsOf(householdId), claimId);
  if (!claim) throw httpError(404, 'Claim not found');
  return claim;
}

async function save(claim: ClaimCase) {
  await store.set(claimsOf(claim.householdId), claim.id, claim);
  return claim;
}

/** Stores the letter, reads it (Pro), finds the patient and policy, and assesses it with the engine. */
export async function createClaim(household: Household, file: LetterFile) {
  const id = `clm_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const letterPath = `households/${household.id}/claims/${id}/${file.filename.replace(/[^\w.-]+/g, '_')}`;
  await blobs.put(letterPath, file.bytes, file.mimeType);
  const claim = await save({
    id,
    householdId: household.id,
    letterPath,
    letterMimeType: file.mimeType,
    isSample: file.isSample ?? false,
    status: 'reading',
    createdAt: new Date().toISOString(),
  });

  try {
    const letter = await readSettlementLetter(file, { fixture: file.fixture });
    const memberId = matchPatient(household, letter.patientName);
    const policy = matchPolicy(household, letter, memberId);
    const productKey = await findProductKey(policy, letter);
    const bill = ClaimBill.parse({
      total: letter.billAmount,
      roomRentPerDay: letter.roomRentPerDay,
      icuStay: letter.icuStay ?? false,
    });
    return assess(household, { ...claim, letter, memberId, policyId: policy.id, productKey, bill });
  } catch (error) {
    return save({ ...claim, status: 'failed', error: (error as Error).message });
  }
}

/** Runs the engine on the claim, with any corrections the family made to the bill facts. */
export async function assess(
  household: Household,
  claim: ClaimCase,
  corrections: Partial<ClaimBill> = {},
) {
  if (!claim.letter || !claim.bill) throw httpError(409, 'This claim has no letter to assess');
  const policy = household.policies.find((p) => p.id === claim.policyId);
  if (!policy) throw httpError(409, 'The policy for this claim is no longer in the household');
  const bill = ClaimBill.parse({ ...claim.bill, ...defined(corrections) });
  const raw = assessClaim(claim.letter, bill, policy);
  const assessment = await citeDeductions(
    raw,
    claim.letter,
    bill,
    claim.productKey,
    policy.documentIds?.[0] ?? claim.id,
  );
  // A new assessment makes any drafted appeal stale.
  return save({
    ...claim,
    bill,
    assessment,
    appeal: undefined,
    status: 'assessed',
    error: undefined,
  });
}

/** Drafts the appeal (Pro), renders the full letter and verifies it. */
export async function draftClaimAppeal(household: Household, claim: ClaimCase) {
  const { letter, assessment } = claim;
  if (!letter || !assessment) throw httpError(409, 'Assess the claim before drafting an appeal');
  if (assessment.recoverable <= 0) throw httpError(409, 'Nothing in this claim can be appealed');
  const clauses = await listClauses(claim.productKey);
  const draft = await draftAppeal({ letter, assessment, clauses });
  const text = renderAppealText({
    draft,
    letter,
    assessment,
    clauses,
    sender: senderName(household, claim),
    date: household.asOf ?? new Date().toISOString().slice(0, 10),
  });
  const appeal: ClaimAppeal = {
    draft,
    text,
    verification: verifyAppeal({ text, assessment, bill: claim.bill!, clauses }),
    edited: false,
    updatedAt: new Date().toISOString(),
  };
  return save({ ...claim, appeal, status: 'appeal_drafted' });
}

/** The family edited the letter: verify the new text again. */
export async function updateAppealText(claim: ClaimCase, text: string) {
  if (!claim.appeal || !claim.assessment || !claim.bill) throw httpError(409, 'No appeal drafted');
  const clauses = await listClauses(claim.productKey);
  const appeal: ClaimAppeal = {
    ...claim.appeal,
    text,
    edited: true,
    verification: verifyAppeal({ text, assessment: claim.assessment, bill: claim.bill, clauses }),
    updatedAt: new Date().toISOString(),
  };
  return save({ ...claim, appeal });
}

/**
 * Prints the verified letter. Refused (409, with the failed checks) while any check fails.
 * The appeal is kept on the claim rather than as an Action, so the generic action approve
 * route can never print an unverified letter.
 */
export async function appealPdf(claim: ClaimCase) {
  const appeal = claim.appeal;
  if (!appeal) throw httpError(409, 'No appeal drafted');
  if (!appeal.verification.ok) {
    throw httpError(409, 'The appeal letter failed verification', {
      checks: appeal.verification.checks.filter((c) => !c.ok),
    });
  }
  const bytes = await renderAppealPdf(appeal.text, appeal.draft.subject);
  const path = `households/${claim.householdId}/claims/${claim.id}/appeal.pdf`;
  await blobs.put(path, bytes, 'application/pdf');
  return { bytes, path, filename: `appeal-${claim.letter?.claimNumber ?? claim.id}.pdf` };
}

/** The household member named on the letter (by first name, ignoring titles). */
function matchPatient(household: Household, patientName: string) {
  const first = patientName
    .replace(/^(mr|mrs|ms|smt|shri|dr)\.?\s+/i, '')
    .split(/\s+/)[0]
    ?.toLowerCase();
  return household.members.find((m) => m.name.toLowerCase().split(/\s+/)[0] === first)?.id;
}

const HEALTH: Policy['kind'][] = ['retail_health', 'group_health'];

/** The policy that settled the claim: same policy number, else the base health cover of the patient. */
function matchPolicy(household: Household, letter: SettlementLetter, memberId?: string) {
  const byNumber = household.policies.find(
    (p) => letter.policyNumber && p.policyNumber === letter.policyNumber,
  );
  const date = letter.admissionDate ?? letter.letterDate;
  const covering = household.policies.filter(
    (p) =>
      HEALTH.includes(p.kind) &&
      (!memberId || p.coveredMemberIds.includes(memberId)) &&
      (!date || (p.startDate <= date && date <= p.endDate)),
  );
  const policy = byNumber ?? covering.find((p) => p.source === 'personal') ?? covering[0];
  if (!policy) {
    throw httpError(422, `No health policy in this household covers ${letter.patientName}`);
  }
  return policy;
}

function senderName(household: Household, claim: ClaimCase) {
  return (
    claim.letter?.patientName ??
    household.members.find((m) => m.id === claim.memberId)?.name ??
    '[Name]'
  );
}

const defined = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
