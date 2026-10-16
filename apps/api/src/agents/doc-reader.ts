import { DocExtraction, type Member } from '@kavach/schemas';
import { generateStructured, models } from '../lib/gemini';

/** docs/plan/03-gemini-and-agents.md §4.2 (ScheduleExtractor), with classification folded in. */
const PROMPT = `ROLE
You read Indian insurance documents and extract policy facts exactly as printed.

TASK
1. Classify the document: benefits_summary (employer group cover), policy_schedule, wording,
   estimate (hospital estimate), settlement_letter (claim settlement), or other.
2. For a benefits summary or policy schedule, fill "policy": kind, insurer, product name, UIN if printed,
   policy number, source (employer or personal), employer name for group cover, sum insured, premium,
   start and end dates, and the terms: room rent limit per day, ICU limit per day, co-pay percent and the
   minimum age it applies from, deductible, and whether proportionate deduction applies.
3. List the insured persons as printed (name, relation, age). For group cover, fill "employment".
4. For any other document, write a one-line "summary" and leave "policy" out.

RULES
- Copy numbers exactly as printed. Convert "5,00,000" and "5 lakh" to 500000. Never round.
- If a value is not printed, leave it out. Never guess a policy number, UIN or date.
- Evidence: for every policy term you fill, add an entry to policy.terms.citations keyed by the term
  (sumInsured, roomRentLimitPerDay, icuLimitPerDay, icu, copayPercent, deductible, proportionateDeduction,
  nonPayables) with the page number (from 1), the clause number if printed, and a verbatim quote of
  5–30 words that contains it. Put other facts worth citing in "citations".
- Use the document id you are given in every citation.`;

/** Picks the recorded answer for FAKE_LLM=1 from the uploaded file's name. */
export function fixtureFor(filename: string) {
  const name = filename.toLowerCase();
  if (/acme|benefit/.test(name)) return 'doc-benefits-acme';
  if (/super.?top.?up|top.?up/.test(name)) return 'doc-schedule-supertopup';
  if (/estimate/.test(name)) return 'doc-estimate';
  if (/settlement|letter/.test(name)) return 'doc-settlement-letter';
  return 'doc-schedule-parents';
}

/** Reads one uploaded PDF or image with Gemini (multimodal input) into a DocExtraction. */
export async function readDocument(input: {
  documentId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  members: Member[];
  /** Overrides the fixture picked from the file name (evals use one per wording). */
  fixture?: string;
  /** Extra instructions for this document, e.g. how to read a full wording (evals). */
  instructions?: string;
}) {
  const family = input.members.map(({ name, relation, age }) => ({ name, relation, age }));
  return generateStructured({
    model: models.pro,
    schema: DocExtraction,
    systemInstruction: PROMPT,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: input.mimeType, data: input.bytes.toString('base64') } },
          {
            text: [
              `Document id: ${input.documentId}. File name: ${input.filename}.`,
              `Household members: ${JSON.stringify(family)}`,
              input.instructions,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      },
    ],
    fixture: input.fixture ?? fixtureFor(input.filename),
  });
}
