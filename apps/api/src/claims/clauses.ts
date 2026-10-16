import type {
  ClaimAssessment,
  ClaimBill,
  Citation,
  Clause,
  Policy,
  SettlementLetter,
} from '@kavach/schemas';
import { clauseId, listClauses, productKeyFor, searchClauses } from '../retrieval/clauses';

/**
 * The clause-library product a claim's clauses come from: the policy's UIN when the library
 * has it, else the one product whose insurer matches the name printed on the letter.
 */
export async function findProductKey(policy: Policy, letter: SettlementLetter) {
  const all = await listClauses();
  const own = productKeyFor(policy);
  if (own && all.some((c) => c.productKey === own)) return own;
  const insurer = normalise(letter.insurer);
  const keys = [
    ...new Set(all.filter((c) => normalise(c.insurer) === insurer).map((c) => c.productKey)),
  ];
  if (keys.length <= 1) return keys[0];
  // Several products from this insurer: pick the one whose clauses match the clause numbers
  // the letter printed (e.g. "Clause 3.2" next to a proportionate deduction).
  const score = (key: string) =>
    letter.deductions.reduce((total, d) => {
      const clause = d.clauseRef && all.find((c) => c.id === clauseId(key, d.clauseRef!));
      return total + (clause ? overlap(clause.text, `${d.label} ${d.reasonGiven ?? ''}`) : 0);
    }, 0);
  const [best] = keys.map((key) => ({ key, score: score(key) })).sort((a, b) => b.score - a.score);
  return best && best.score > 0 ? best.key : undefined;
}

const wordsOf = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
const overlap = (a: string, b: string) => {
  const words = wordsOf(a);
  return [...wordsOf(b)].filter((w) => words.has(w)).length;
};

/** What to look for in the wording to back each claim rule. */
function queryFor(ruleId: string, bill: ClaimBill): string | undefined {
  switch (ruleId) {
    case 'R-CLM-001':
    case 'R-HL-001':
      return 'proportionate deduction room category rent higher than eligible limit';
    case 'R-CLM-002':
      return 'associated medical expenses pharmacy consumables implants diagnostics';
    case 'R-CLM-008':
      return bill.icuStay
        ? 'intensive care unit ICU proportionate deductions'
        : 'differential billing room category proportionate deduction';
    case 'R-CLM-004':
    case 'R-HL-005':
      return 'non-payable items listed annexure coverage not available';
    case 'R-CLM-005':
      return 'co-payment admissible claim';
    default:
      return undefined;
  }
}

/**
 * Gives every deduction a citation to a library clause: the clause the letter printed for it,
 * or the best match for the rule the engine applied. Citations the engine already linked stay.
 */
export async function citeDeductions(
  assessment: ClaimAssessment,
  letter: SettlementLetter,
  bill: ClaimBill,
  productKey: string | undefined,
  documentId: string,
): Promise<ClaimAssessment> {
  if (!productKey) return assessment;
  const clauses = await listClauses(productKey);
  const deductions = await Promise.all(
    assessment.deductions.map(async (d) => {
      if (d.citation?.clauseId || !d.ruleId) return d;
      const query = queryFor(d.ruleId, bill);
      const printedRef = letter.deductions.find((x) => x.label === d.label)?.clauseRef;
      const printed = printedRef
        ? clauses.find((c) => c.id === clauseId(productKey, printedRef))
        : undefined;
      const clause =
        printed ??
        (query ? (await searchClauses(query, productKey, 1))[0]?.clause : undefined) ??
        undefined;
      if (!clause) return d;
      const citation: Citation = {
        documentId,
        page: clause.page,
        clauseRef: clause.ref,
        clauseId: clause.id,
        quote: bestSentence(clause, query ?? d.label),
      };
      return { ...d, citation };
    }),
  );
  return { ...assessment, deductions };
}

/** The clause sentence sharing most words with the query (skipping the heading). */
function bestSentence(clause: Clause, query: string) {
  const words = new Set(query.toLowerCase().match(/[a-z]{3,}/g) ?? []);
  const sentences = clause.text.split(/(?<=\.)\s+/).filter((s) => s.length > 30);
  const score = (s: string) =>
    (s.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => words.has(w)).length;
  return sentences.sort((a, b) => score(b) - score(a))[0] ?? clause.text;
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(sample\)|[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
