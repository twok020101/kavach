/**
 * Exercises the claims gate without a model: with FAKE_LLM=1 the classifier returns the
 * recorded `claim-letter-kind` fixture (a letter) unless `?kind=` names another, so this
 * uploads the same sample twice and expects an assessed claim for the letter and a failed one,
 * with the reason, for the `claim-letter-kind-brochure` answer (not a claim letter).
 *
 *   FAKE_LLM=1 PORT=8090 pnpm --filter @kavach/api dev   # in another shell
 *   API_URL=http://localhost:8090 pnpm --filter @kavach/api exec tsx ../../scripts/claims-refusal-check.mts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:8080';
const TOKEN = process.env.ID_TOKEN;
const auth = TOKEN ? { authorization: `Bearer ${TOKEN}` } : {};
const sample = resolve(import.meta.dirname, '../data/samples/lotus-maternity-estimate.png');

let failed = false;
function expect(name: string, got: unknown, want: unknown) {
  const ok = got === want;
  if (!ok) failed = true;
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (wanted ${JSON.stringify(want)})`}`,
  );
}

async function upload(hid: string, query: string) {
  const form = new FormData();
  form.set('file', new Blob([readFileSync(sample)], { type: 'image/png' }), 'upload.png');
  const res = await fetch(`${API}/v1/households/${hid}/claims${query}`, {
    method: 'POST',
    headers: auth,
    body: form,
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const demo = await fetch(`${API}/v1/public/demo?checkpoint=claim`, {
  method: 'POST',
  headers: auth,
});
const { householdId } = (await demo.json()) as { householdId: string };

// The upload always answers 201 with the claim; the gate's verdict is the claim's status.
console.log('== a claim letter (recorded classification) is read and assessed');
const letter = await upload(householdId, '?fixture=claim-letter-cx1');
expect('status', letter.status, 201);
expect('claim status', letter.body.status, 'assessed');

console.log('== a brochure (recorded classification) is refused with a reason');
const brochure = await upload(householdId, '?kind=claim-letter-kind-brochure');
expect('status', brochure.status, 201);
expect('claim status', brochure.body.status, 'failed');
expect(
  'the error names what it looks like',
  String(brochure.body.error ?? '').includes('a maternity insurance plan brochure'),
  true,
);

console.log(failed ? 'FAIL' : 'PASS');
process.exit(failed ? 1 : 0);
