import { formatInr, RULES } from '@kavach/engine';
import type { AppealDraft, ClaimAssessment, Clause, SettlementLetter } from '@kavach/schemas';

/** "2027-03-02" → "02-03-2027", the way Indian letters print dates. */
const indianDate = (iso?: string) => (iso ? iso.split('-').reverse().join('-') : '[date]');

/**
 * The full appeal letter as plain text: address and reference blocks from the letter,
 * the drafter's paragraphs, each challenged item's clause quote and rule ids, and the sign-off.
 * This text is what the family approves, the verifier checks and the PDF prints.
 */
export function renderAppealText(input: {
  draft: AppealDraft;
  letter: SettlementLetter;
  assessment: ClaimAssessment;
  clauses: Clause[];
  sender: string;
  date: string;
}) {
  const { draft, letter, assessment, clauses, sender, date } = input;
  const lines: string[] = [
    indianDate(date),
    '',
    'From:',
    sender,
    '[Address]',
    '[Phone]',
    '',
    'To:',
    'The Grievance Redressal Officer',
    letter.insurer,
    ...(letter.grievanceEmail ? [letter.grievanceEmail] : []),
    '',
    `Subject: ${draft.subject}`,
    '',
    `Claim No.: ${letter.claimNumber}`,
    `Policy No.: ${letter.policyNumber ?? '[policy number]'}`,
    `Patient: ${letter.patientName}`,
    `Hospital: ${letter.hospitalName}`,
    `Admitted: ${indianDate(letter.admissionDate)} · Discharged: ${indianDate(letter.dischargeDate)}`,
    `Bill: ${formatInr(letter.billAmount)} · Approved and paid: ${formatInr(letter.approvedAmount)} (settlement letter dated ${indianDate(letter.letterDate)})`,
    '',
    'Dear Sir or Madam,',
    '',
    draft.summary,
  ];

  draft.items.forEach((item, i) => {
    const deduction = assessment.deductions.find((d) => d.label === item.label);
    const clause = clauses.find((c) => c.id === item.clauseId);
    lines.push(
      '',
      `${i + 1}. ${item.label}: ${deduction ? formatInr(deduction.amount) : '[amount]'} deducted`,
      item.paragraph,
    );
    if (clause && item.quote) {
      lines.push(`Clause ${clause.ref} (${clause.title}) of the policy wording: “${item.quote}”`);
    }
    const sources = [
      ...new Set(
        item.ruleIds.flatMap(
          // Published regulations only; the policy wording is cited by clause already.
          (id) => RULES[id]?.sources.filter((s) => s.url).map((s) => s.title) ?? [],
        ),
      ),
    ];
    if (item.ruleIds.length > 0) {
      lines.push(
        `Basis: ${[clause && `Clause ${clause.ref}`, ...item.ruleIds].filter(Boolean).join(', ')}${sources.length ? `; see ${sources.join('; ')}` : ''}.`,
      );
    }
  });

  lines.push('', draft.request);
  if (draft.enclosures.length > 0) {
    lines.push('', 'Enclosures:', ...draft.enclosures.map((e) => `- ${e}`));
  }
  lines.push('', 'Yours faithfully,', '', sender);
  return lines.join('\n');
}
