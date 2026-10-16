/**
 * Offline spoken-amount check (docs/plan/03 §9.2): reads a rehearsal transcript, finds every rupee
 * amount spoken in Hindi words (Latin script, as `hindiWords` writes them), English words or digits,
 * and compares them with the amounts in the engine's answer.
 *
 *   pnpm transcript:check <transcript.txt> --answer <answer.json|answer.txt>
 *   pnpm transcript:check <transcript.txt> --example hx1 [--locale hi|en]
 *
 * The answer is a DeskAnswer JSON (its `say` line) or the say line as text; `--example hx1` builds
 * it from the engine's HX-1 worked example. If the transcript has "Kavach:" lines, only those count.
 * Exits 1 on any mismatch. Amounts under ₹100 are ignored ("ek", "do" are also ordinary words).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildDeskSay, evaluateHospital, examples, formatInr, hindiWords } from '@kavach/engine';

const UNITS = new Map<string, number>();
for (let n = 0; n < 100; n++) UNITS.set(hindiWords(n), n);
// prettier-ignore
const ENGLISH = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
ENGLISH.forEach((w, n) => UNITS.set(w, n));
['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'].forEach((w, i) =>
  UNITS.set(w, (i + 2) * 10),
);

/** Scale words, including common spellings in transcripts and Devanagari. */
const SCALES = new Map<string, number>([
  ...['sau', 'hundred', 'सौ'].map((w) => [w, 100] as const),
  ...['hazaar', 'hazar', 'hajaar', 'hajar', 'thousand', 'हज़ार', 'हजार'].map(
    (w) => [w, 1_000] as const,
  ),
  ...['lakh', 'lakhs', 'lac', 'lacs', 'लाख'].map((w) => [w, 1_00_000] as const),
  ...['crore', 'crores', 'karod', 'करोड़', 'करोड'].map((w) => [w, 1_00_00_000] as const),
]);

const DEVANAGARI_DIGITS = /[०-९]/g;

/** Every amount spoken in the text, in order. */
export function spokenAmounts(text: string): number[] {
  const tokens =
    text
      .replace(DEVANAGARI_DIGITS, (d) => String(d.charCodeAt(0) - 0x0966))
      .toLowerCase()
      .match(/\d[\d,]*(?:\.\d+)?|[a-zऀ-ॿ]+/g) ?? [];

  const amounts: number[] = [];
  let total = 0;
  let current = 0;
  let inNumber = false;
  const flush = () => {
    if (inNumber) amounts.push(Math.round(total + current));
    total = current = 0;
    inNumber = false;
  };

  for (const [i, token] of tokens.entries()) {
    const digits = /^\d/.test(token) ? Number(token.replace(/,/g, '')) : undefined;
    const unit = digits ?? UNITS.get(token);
    const scale = SCALES.get(token);
    if (unit !== undefined) {
      // Joins "lakh pachaas", "sau pachaas" and "fifty eight"; "800 1200" or "aath nau" are two numbers.
      const joins =
        inNumber &&
        digits === undefined &&
        (current % 100 === 0 || (current % 10 === 0 && unit < 10));
      if (inNumber && !joins) flush();
      current += unit;
      inNumber = true;
    } else if (scale !== undefined && inNumber) {
      if (scale === 100) current *= 100;
      else if (scale === 1_00_00_000) [total, current] = [(total + current) * scale, 0];
      else [total, current] = [total + current * scale, 0];
    } else if (token === 'and' && inNumber && UNITS.has(tokens[i + 1] ?? '')) {
      continue;
    } else {
      flush();
    }
  }
  flush();
  return amounts.filter((a) => a >= 100);
}

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

// pnpm runs this from apps/api; resolve paths from where the command was typed.
const fromCwd = (p: string) => resolve(process.env.INIT_CWD ?? '.', p);

async function engineSay(): Promise<string> {
  const answer = arg('--answer');
  if (answer) {
    const raw = await readFile(fromCwd(answer), 'utf8');
    return answer.endsWith('.json') ? (JSON.parse(raw) as { say: string }).say : raw;
  }
  if (arg('--example') === 'hx1') {
    const locale = arg('--locale') === 'en' ? 'en' : 'hi';
    const names = {
      pol_parents_migrated: locale === 'hi' ? 'parents wali policy' : "parents' policy",
    };
    return buildDeskSay(
      evaluateHospital(examples.HX1_CONTEXT, examples.hx1Estimate('differential')),
      locale,
      {
        policyNames: names,
      },
    );
  }
  throw new Error('Pass --answer <file> or --example hx1');
}

/** Only the agent's lines, when the transcript marks speakers. */
function agentLines(transcript: string) {
  const lines = transcript.split('\n');
  const agent = lines.filter((l) => /^\s*(kavach|agent)\s*:/i.test(l));
  return agent.length ? agent.join('\n') : transcript;
}

/** Items in `a` not matched one-for-one in `b`. */
function minus(a: number[], b: number[]) {
  const left = [...b];
  return a.filter((x) => {
    const i = left.indexOf(x);
    if (i === -1) return true;
    left.splice(i, 1);
    return false;
  });
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith('--'))
    throw new Error('Usage: check-transcript <transcript.txt> --answer <file> | --example hx1');

  const expected = spokenAmounts(await engineSay());
  const heard = spokenAmounts(agentLines(await readFile(fromCwd(file), 'utf8')));
  const missing = minus(expected, heard);
  const unexpected = minus(heard, expected);
  const list = (xs: number[]) => xs.map(formatInr).join(', ') || 'none';

  console.log(`Transcript: ${file}`);
  console.log(`Engine amounts: ${list(expected)}`);
  console.log(`Spoken amounts: ${list(heard)}`);
  for (const x of missing)
    console.log(`  MISSING     ${formatInr(x)}: in the engine answer, not spoken`);
  for (const x of unexpected)
    console.log(`  UNEXPECTED  ${formatInr(x)}: spoken, not in the engine answer`);
  const ok = missing.length === 0 && unexpected.length === 0;
  console.log(ok ? 'OK: every spoken amount matches the engine.' : 'MISMATCH');
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(2);
});
