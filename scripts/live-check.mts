/**
 * Drives the live desk socket like a phone would, to check it end to end without a browser:
 * demo household → desk session for Suresh (Hindi) → sample estimate capture → WebSocket →
 * PCM mic chunks + end of turn → expects captions, the ₹90,000 card and audio frames back.
 *
 *   API_URL=http://localhost:8187 pnpm --filter @kavach/api exec tsx ../../scripts/live-check.mts
 *
 * Runs against FAKE_LLM=1 or a real Gemini Live session (then speak instead of the tone).
 */
import type { LiveServerMessage } from '@kavach/schemas';

const API = process.env.API_URL ?? 'http://localhost:8080';
const TOKEN = process.env.ID_TOKEN; // a Firebase ID token when the API has auth on

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      ...(body !== undefined && { 'content-type': 'application/json' }),
      ...(TOKEN && { authorization: `Bearer ${TOKEN}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** 40 ms of a 220 Hz tone as base64 PCM16 LE mono 16 kHz: a stand-in for speech. */
function micChunk(index: number) {
  const n = 640;
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    pcm.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * 220 * (index * n + i)) / 16000) * 8000),
      i * 2,
    );
  }
  return pcm.toString('base64');
}

const { householdId } = await post<{ householdId: string }>('/v1/public/demo?checkpoint=hospital');
const desk = `/v1/households/${householdId}/desk/sessions`;
const { sessionId } = await post<{ sessionId: string }>(desk, {
  patientMemberId: 'mem_suresh',
  language: 'hi',
  channel: 'live',
});
await post(`${desk}/${sessionId}/captures:sample`);
console.log(`session ${sessionId} (household ${householdId}), sample estimate captured`);

const wsUrl = new URL(`/v1/live/${sessionId}`, API.replace(/^http/, 'ws'));
wsUrl.searchParams.set('hid', householdId);
if (TOKEN) wsUrl.searchParams.set('token', TOKEN);

const started = Date.now();
const got: LiveServerMessage[] = [];
let firstAudioMs: number | undefined;
let turnEndedAt = 0;

await new Promise<void>((resolve, reject) => {
  const ws = new WebSocket(wsUrl);
  const timeout = setTimeout(() => reject(new Error('timed out waiting for turnComplete')), 30_000);
  ws.onerror = () => reject(new Error('socket error'));
  ws.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as LiveServerMessage;
    got.push(message);
    if (message.type === 'ready') {
      ws.send(JSON.stringify({ type: 'hello', language: 'hi', sampleRate: 16000 }));
      for (let i = 0; i < 50; i++) ws.send(JSON.stringify({ type: 'audio', data: micChunk(i) }));
      ws.send(JSON.stringify({ type: 'audioEnd' }));
      turnEndedAt = Date.now();
    }
    if (message.type === 'audio') firstAudioMs ??= Date.now() - turnEndedAt;
    if (message.type === 'error') reject(new Error(`server error ${message.code}`));
    if (message.type === 'turnComplete') {
      clearTimeout(timeout);
      ws.send(JSON.stringify({ type: 'end' }));
      resolve();
    }
  };
});

const of = <T extends LiveServerMessage['type']>(type: T) =>
  got.filter((m): m is Extract<LiveServerMessage, { type: T }> => m.type === type);
const captions = of('caption').filter((c) => c.final);
const cards = of('card');
const saving = cards.flatMap((c) => c.card.amounts).find((a) => a.amount === 90_000 && a.emphasis);
const audio = of('audio');
const audioBytes = audio.reduce((sum, a) => sum + Buffer.from(a.data, 'base64').length, 0);

for (const c of captions) console.log(`caption ${c.role}: ${c.text}`);
console.log(
  `steps: ${of('step')
    .map((s) => `${s.label}:${s.state}`)
    .join(' ')}`,
);
console.log(`cards: ${cards.map((c) => c.card.id).join(', ')}`);
console.log(
  `saving card amount: ${saving ? `₹${saving.amount.toLocaleString('en-IN')} (${saving.label})` : 'missing'}`,
);
console.log(
  `audio: ${audio.length} frames, ${audioBytes} bytes = ${(audioBytes / 2 / 24000).toFixed(1)} s at 24 kHz; first audio ${firstAudioMs} ms after end of turn`,
);
console.log(`total ${Date.now() - started} ms`);

const ok =
  captions.some((c) => c.role === 'user') &&
  captions.some((c) => c.role === 'agent') &&
  saving &&
  audio.length > 0;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
