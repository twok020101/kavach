import { formatInr } from '@kavach/engine';
import type {
  AppealCheck,
  AppealVerification,
  ClaimAssessment,
  ClaimBill,
  Clause,
} from '@kavach/schemas';

/**
 * Checks the appeal letter text in code (docs/plan/03 §6) before it can become a PDF:
 * - every quoted passage appears verbatim in the clause it is attributed to (or, with no
 *   clause named, in some clause of the policy wording);
 * - every rupee amount is one the engine produced or read for this claim;
 * - every clause number exists in the wording and every rule id is one the engine applied;
 * - the total asked for is the engine's recoverable amount.
 */
export function verifyAppeal(input: {
  text: string;
  assessment: ClaimAssessment;
  bill: ClaimBill;
  clauses: Clause[];
}): AppealVerification {
  const { text, assessment, bill, clauses } = input;
  const checks: AppealCheck[] = [];
  const byRef = new Map(clauses.map((c) => [c.ref, c]));

  // Quotes: “…” or "…", attributed to the last clause number named before them in the paragraph.
  for (const match of text.matchAll(/[“"]([^”"]{8,})[”"]/g)) {
    const quote = match[1]!;
    const paragraph = text.slice(text.lastIndexOf('\n\n', match.index) + 1, match.index);
    const ref = [...paragraph.matchAll(/\bClause\s+(\d+(?:\.\d+)*)/gi)].at(-1)?.[1];
    const clause = ref ? byRef.get(ref) : undefined;
    const source = clause
      ? contains(clause.text, quote)
        ? clause
        : undefined
      : clauses.find((c) => contains(c.text, quote));
    checks.push({
      kind: 'quote',
      ok: Boolean(source),
      subject: short(quote),
      detail: source
        ? `Found word for word in clause ${source.ref}.`
        : ref
          ? `Not found in clause ${ref} of the policy wording.`
          : 'Not found in any clause of the policy wording.',
    });
  }

  // Amounts: each must be one of the engine's numbers for this claim.
  const allowed = engineAmounts(assessment, bill);
  const seen = new Set<string>();
  for (const match of text.matchAll(/(?:₹|\bRs\.?)\s?(\d[\d,]*)/g)) {
    const amount = Number(match[1]!.replaceAll(',', ''));
    const label = formatInr(amount);
    if (seen.has(label)) continue;
    seen.add(label);
    const ok = allowed.has(amount);
    checks.push({
      kind: 'amount',
      ok,
      subject: label,
      detail: ok
        ? 'Matches the engine’s assessment.'
        : 'Not an amount in the engine’s assessment of this claim.',
    });
  }

  for (const ref of unique(text, /\bClause\s+(\d+(?:\.\d+)*)/gi)) {
    const clause = byRef.get(ref);
    checks.push({
      kind: 'clause',
      ok: Boolean(clause),
      subject: `Clause ${ref}`,
      detail: clause ? clause.title : 'No such clause in the policy wording.',
    });
  }

  const applied = new Set(assessment.trace.map((f) => f.ruleId));
  for (const id of unique(text, /\bR-[A-Z]+-\d{3}\b/g)) {
    const ok = applied.has(id);
    checks.push({
      kind: 'rule',
      ok,
      subject: id,
      detail: ok ? 'Applied by the engine to this claim.' : 'Not a rule the engine applied here.',
    });
  }

  const total = formatInr(assessment.recoverable);
  const asked = text.includes(total);
  checks.push({
    kind: 'total',
    ok: asked,
    subject: total,
    detail: asked
      ? 'The letter asks for the engine’s recoverable amount.'
      : 'The letter does not ask for the engine’s recoverable amount.',
  });

  return { ok: checks.every((c) => c.ok), checks, checkedAt: new Date().toISOString() };
}

/** Every rupee amount the engine produced or read for this claim. */
function engineAmounts(assessment: ClaimAssessment, bill: ClaimBill) {
  const amounts = new Set<number>([assessment.recoverable, assessment.expectedPayout]);
  if (assessment.approved !== undefined) amounts.add(assessment.approved);
  if (bill.roomRentPerDay !== undefined) amounts.add(bill.roomRentPerDay);
  amounts.add(bill.total);
  for (const d of assessment.deductions) {
    amounts.add(d.amount).add(d.recoverable);
    // Amounts the engine wrote into its reasons, e.g. the room-rent limit.
    for (const m of d.reason.matchAll(/₹(\d[\d,]*)/g))
      amounts.add(Number(m[1]!.replaceAll(',', '')));
  }
  // R-CLM-005 records the bill, the total deducted, the co-pay and the approved amount.
  for (const firing of assessment.trace.filter((f) => f.ruleId === 'R-CLM-005')) {
    for (const value of [...Object.values(firing.inputs), ...Object.values(firing.output)]) {
      if (typeof value === 'number' && value >= 100) amounts.add(value);
    }
  }
  return amounts;
}

const squash = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const contains = (haystack: string, needle: string) => squash(haystack).includes(squash(needle));

const unique = (text: string, pattern: RegExp) => [
  ...new Set([...text.matchAll(pattern)].map((m) => m[1] ?? m[0])),
];

const short = (s: string) => (s.length > 90 ? `${s.slice(0, 87)}…` : s);
