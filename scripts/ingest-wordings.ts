/**
 * Builds the clause library from policy wordings: Flash splits each wording into
 * verbatim clauses, the embedding model embeds them, and the result goes to the
 * store and to apps/api/src/retrieval/seed-clauses.json (loaded at API start-up).
 *
 *   pnpm ingest            # with FAKE_LLM=1 the clauses come from apps/api/fixtures/clauses-*.json
 *
 * The eval wordings in data/wordings/manifest.yaml are added once fetched (`pnpm wordings:fetch`);
 * with FAKE_LLM=1 only those with a recorded clauses-<uin> fixture are included.
 */
import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ClauseList } from '@kavach/schemas';
import { env } from '../apps/api/src/env';
import { generateStructured, models } from '../apps/api/src/lib/gemini';
import { appRoot, repoRoot } from '../apps/api/src/paths';
import { clauseId, productKeyFor, saveClauses } from '../apps/api/src/retrieval/clauses';
import { hasPdf, loadManifest, pdfPath } from '../evals/wordings';

/** The Sharma family's wordings (sample documents with a wording extract). */
const WORDINGS = [
  {
    file: 'data/samples/parents-policy-schedule.pdf',
    fixture: 'clauses-parents',
    insurer: 'Suraksha Health Insurance Ltd (SAMPLE)',
    productName: 'Suraksha Family Health Plan',
    uin: 'SAMPLE-SHI-FHP-001',
  },
  {
    file: 'data/samples/supertopup-schedule.pdf',
    fixture: 'clauses-supertopup',
    insurer: 'Nidhi General Insurance Co. Ltd (SAMPLE)',
    productName: 'Nidhi Super Top-Up Health',
    uin: 'SAMPLE-NGI-STU-002',
  },
  {
    // Group cover has no UIN; the policy number is the key.
    file: 'data/samples/acme-benefits-summary.pdf',
    fixture: 'clauses-acme',
    insurer: 'Suraksha Health Insurance Ltd (SAMPLE)',
    productName: 'Acme Software Group Mediclaim (family floater)',
    policyNumber: 'SHI/GMC/2026/ACME/0021',
  },
];

/** docs/plan/03-gemini-and-agents.md §4.3 */
const PROMPT = `ROLE
You split an insurance policy wording into numbered clauses.

TASK
Return each numbered clause with: ref as printed (e.g. "3.2"), a short title (the clause heading
if printed), the page it starts on (from 1), the full verbatim text, and a category from:
definition, coverage, limit, copay, deductible, waiting_period, exclusion, claim_procedure,
grievance, portability, other.

RULES
- Text must be verbatim. Do not summarise. Join hyphenated line breaks.
- Skip schedule tables, page headers and footers.`;

const seedFile = resolve(repoRoot, 'apps/api/src/retrieval/seed-clauses.json');

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

/** The public eval wordings that are ready to ingest. */
async function evalWordings() {
  const ready = [];
  for (const w of await loadManifest()) {
    const fixture = `clauses-${w.uin}`;
    const ok = env.FAKE_LLM
      ? await exists(resolve(appRoot, 'fixtures', `${fixture}.json`))
      : await hasPdf(w.uin);
    if (!ok) {
      console.log(`${w.uin}: skipped (${env.FAKE_LLM ? 'no fixture' : 'not fetched'})`);
      continue;
    }
    ready.push({
      file: pdfPath(w.uin),
      fixture,
      insurer: w.insurer,
      productName: w.product,
      uin: w.uin,
    });
  }
  return ready;
}

async function main() {
  const library = [];
  for (const wording of [...WORDINGS, ...(await evalWordings())]) {
    const productKey = productKeyFor(wording)!;
    const pdf = await readFile(resolve(repoRoot, wording.file));
    const { clauses } = await generateStructured({
      model: models.flash,
      schema: ClauseList,
      systemInstruction: PROMPT,
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType: 'application/pdf', data: pdf.toString('base64') } }],
        },
      ],
      fixture: wording.fixture,
    });
    const stored = await saveClauses(
      clauses.map((c) => ({
        ...c,
        id: clauseId(productKey, c.ref),
        productKey,
        insurer: wording.insurer,
        productName: wording.productName,
      })),
    );
    console.log(`${productKey}: ${stored.length} clauses`);
    library.push(...stored);
  }

  // One clause per line keeps the committed file readable in diffs.
  await writeFile(seedFile, `[\n${library.map((c) => JSON.stringify(c)).join(',\n')}\n]\n`);
  console.log(`Wrote ${library.length} clauses to ${seedFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
