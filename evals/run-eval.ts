/**
 * Policy-reading eval (docs/plan/03-gemini-and-agents.md §9): runs the document reader on each
 * wording in data/wordings/manifest.yaml, compares the terms it extracts with the labels in
 * data/wordings/labels/, and writes evals/results/latest.{json,md} plus a dated copy.
 *
 *   pnpm wordings:fetch && pnpm eval       # real run (Vertex keys in .env)
 *   FAKE_LLM=1 pnpm eval                   # pipeline check on placeholder fixtures
 *   pnpm eval --labels <dir>               # score against another labels folder
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  EvalField,
  EvalResults,
  WordingLabel,
  type DocExtraction,
  type FieldScore,
  type TermValue,
  type WordingResult,
} from '@kavach/schemas';
import { readDocument } from '../apps/api/src/agents/doc-reader';
import { env } from '../apps/api/src/env';
import { models } from '../apps/api/src/lib/gemini';
import { repoRoot } from '../apps/api/src/paths';
import { hasPdf, loadLabel, loadManifest, pdfPath } from './wordings';

const resultsDir = resolve(repoRoot, 'evals/results');
const labelsArg = process.argv.indexOf('--labels');
const labelsDir =
  labelsArg > 0 ? resolve(process.env.INIT_CWD ?? '.', process.argv[labelsArg + 1]!) : undefined;

/** How a full wording differs from the schedules the reader was written for. */
const INSTRUCTIONS = `This is a full policy wording with no schedule.
- Where a limit is a percentage of the sum insured, give it in rupees for a sum insured of 500000,
  applying any rupee cap. Use 500000 as sumInsured and 2026-04-01 to 2027-03-31 as placeholder dates.
- Leave roomRentLimitPerDay, icuLimitPerDay, copayFromAge or deductible out when the wording has none.
- Fill terms.waitingPeriods: initialDays, pedMonths (pre-existing diseases), specificMonths (named illnesses).
- Cite waitingPeriods in terms.citations too.`;

function extractedValues(extraction: DocExtraction): Record<EvalField, TermValue> {
  const t = extraction.policy?.terms;
  const w = t?.waitingPeriods;
  return {
    roomRentLimitPerDay: t?.roomRentLimitPerDay ?? 'none',
    icuLimitPerDay: t?.icuLimitPerDay ?? 'none',
    copayPercent: t?.copayPercent ?? 0,
    copayFromAge: t?.copayFromAge ?? 'none',
    proportionateDeduction: t?.proportionateDeduction ?? null,
    deductible: t?.deductible ?? 0,
    initialWaitingDays: w?.initialDays ?? 'none',
    pedWaitingMonths: w?.pedMonths ?? 'none',
    specificWaitingMonths: w?.specificMonths ?? 'none',
    nonPayables: Boolean(t?.citations.nonPayables),
  };
}

const scored = (label: TermValue) => label !== null && label !== 'schedule';

async function label(uin: string): Promise<WordingLabel> {
  if (!labelsDir) return loadLabel(uin);
  return WordingLabel.parse(JSON.parse(await readFile(resolve(labelsDir, `${uin}.json`), 'utf8')));
}

async function runOne(w: Awaited<ReturnType<typeof loadManifest>>[number]): Promise<WordingResult> {
  const lab = await label(w.uin);
  const base = {
    uin: w.uin,
    insurer: w.insurer,
    product: w.product,
    segment: w.segment,
    humanChecked: lab.checkedBy !== null,
  };
  const unread = (status: 'missing_pdf' | 'failed', error?: string): WordingResult => ({
    ...base,
    status,
    error,
    fields: EvalField.options.map((field) => ({
      field,
      label: lab.fields[field].value,
      extracted: null,
      correct: null,
    })),
  });

  const pdf = await hasPdf(w.uin);
  // Fixture runs don't need the PDF; real runs do.
  if (!pdf && !env.FAKE_LLM) return unread('missing_pdf', 'Run pnpm wordings:fetch');
  try {
    const extraction = await readDocument({
      documentId: w.uin,
      filename: `${w.uin}.pdf`,
      mimeType: 'application/pdf',
      bytes: pdf ? await readFile(pdfPath(w.uin)) : Buffer.alloc(0),
      members: [],
      fixture: `eval-${w.uin}`,
      instructions: INSTRUCTIONS,
    });
    const got = extractedValues(extraction);
    return {
      ...base,
      status: 'read',
      fields: EvalField.options.map((field) => {
        const value = lab.fields[field].value;
        return {
          field,
          label: value,
          extracted: got[field],
          correct: scored(value) ? got[field] === value : null,
        };
      }),
    };
  } catch (error) {
    return unread('failed', (error as Error).message);
  }
}

function score(results: WordingResult[], field?: EvalField) {
  const rows = results
    .flatMap((r) => r.fields)
    .filter((f) => (!field || f.field === field) && f.correct !== null);
  const correct = rows.filter((f) => f.correct).length;
  return { labelled: rows.length, correct, accuracy: rows.length ? correct / rows.length : null };
}

const pct = (a: number | null) => (a === null ? '–' : `${Math.round(a * 100)}%`);
const show = (v: TermValue) => (v === null ? '–' : String(v));

function markdown(r: EvalResults) {
  const lines = [
    `# Policy-reading eval, ${r.runAt.slice(0, 10)}`,
    '',
    `Model: \`${r.model}\` (${r.mode === 'fixtures' ? 'FAKE_LLM fixtures: pipeline check, not model accuracy' : 'live'}).`,
    `Wordings: ${r.wordings} (${r.wordingsRead} read). Labels checked by a person: ${r.labelsChecked} of ${r.wordings}.`,
    `Overall: ${pct(r.overall.accuracy)} (${r.overall.correct}/${r.overall.labelled} labelled fields).`,
    '',
    '| Field | Accuracy | Correct / labelled |',
    '|---|---|---|',
    ...r.perField.map((f) => `| ${f.field} | ${pct(f.accuracy)} | ${f.correct}/${f.labelled} |`),
    '',
    '## Per wording',
  ];
  for (const w of r.results) {
    lines.push(
      '',
      `### ${w.uin}: ${w.insurer}, ${w.product}`,
      `Status: ${w.status}${w.error ? ` (${w.error})` : ''}. Label checked: ${w.humanChecked ? 'yes' : 'no'}.`,
      '',
      '| Field | Label | Extracted | Match |',
      '|---|---|---|---|',
      ...w.fields.map(
        (f) =>
          `| ${f.field} | ${show(f.label)} | ${show(f.extracted)} | ${f.correct === null ? 'not scored' : f.correct ? 'yes' : 'NO'} |`,
      ),
    );
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const manifest = await loadManifest();
  const results: WordingResult[] = [];
  for (const w of manifest) {
    const r = await runOne(w);
    console.log(`${w.uin}: ${r.status}${r.error ? ` (${r.error})` : ''}`);
    results.push(r);
  }

  const perField: FieldScore[] = EvalField.options.map((field) => ({
    field,
    ...score(results, field),
  }));
  const output = EvalResults.parse({
    runAt: new Date().toISOString(),
    model: env.FAKE_LLM ? 'fixtures' : models.pro,
    mode: env.FAKE_LLM ? 'fixtures' : 'live',
    wordings: manifest.length,
    wordingsRead: results.filter((r) => r.status === 'read').length,
    labelsChecked: results.filter((r) => r.humanChecked).length,
    overall: score(results),
    perField,
    results,
  });

  await mkdir(resultsDir, { recursive: true });
  const json = `${JSON.stringify(output, null, 2)}\n`;
  const md = markdown(output);
  const dated = `${output.runAt.slice(0, 10)}-${output.model}`;
  await Promise.all([
    writeFile(resolve(resultsDir, 'latest.json'), json),
    writeFile(resolve(resultsDir, 'latest.md'), md),
    writeFile(resolve(resultsDir, `${dated}.json`), json),
    writeFile(resolve(resultsDir, `${dated}.md`), md),
  ]);
  console.log(
    `Overall ${pct(output.overall.accuracy)} on ${output.overall.labelled} labelled fields; ` +
      `${output.labelsChecked}/${output.wordings} labels checked. Wrote evals/results/latest.{json,md}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
