/**
 * Drives the live desk socket like a phone would, to check it end to end without a browser:
 * demo household → desk session for Suresh (Hindi) → sample estimate capture → WebSocket →
 * PCM mic chunks + end of turn → expects captions, the ₹90,000 card and audio frames back.
 *
 *   API_URL=http://localhost:8187 pnpm --filter @kavach/api exec tsx ../../scripts/live-check.mts
 *
 * Runs against FAKE_LLM=1 or a real Gemini Live session (then speak instead of the tone).
 */
import { readFileSync } from 'node:fs';
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

/**
 * What the "phone" says, as 40 ms chunks of base64 PCM16 LE mono 16 kHz. With `MIC_PCM` set
 * to a raw 16 kHz PCM file (a recorded or synthesised Hindi question) a real model hears
 * speech; without it, a 220 Hz tone stands in, which is enough for FAKE_LLM=1.
 */
function micChunks(): string[] {
  const n = 640;
  if (process.env.MIC_PCM) {
    const pcm = readFileSync(process.env.MIC_PCM);
    const chunks: string[] = [];
    for (let at = 0; at < pcm.length; at += n * 2)
      chunks.push(pcm.subarray(at, at + n * 2).toString('base64'));
    return chunks;
  }
  return Array.from({ length: 50 }, (_, index) => {
    const pcm = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) {
      pcm.writeInt16LE(
        Math.round(Math.sin((2 * Math.PI * 220 * (index * n + i)) / 16000) * 8000),
        i * 2,
      );
    }
    return pcm.toString('base64');
  });
}
const TURN_TIMEOUT_MS = Number(process.env.TURN_TIMEOUT_MS ?? 30_000);

// LIVE_PERSONA=tan LIVE_PATIENT=mem_ahkow LIVE_LANGUAGE=zh runs the Singapore scene.
const PERSONA = process.env.LIVE_PERSONA ?? 'sharma';
const PATIENT = process.env.LIVE_PATIENT ?? 'mem_suresh';
const LANGUAGE = process.env.LIVE_LANGUAGE ?? 'hi';
const { householdId } = await post<{ householdId: string }>(
  `/v1/public/demo?checkpoint=hospital&persona=${PERSONA}`,
);
const desk = `/v1/households/${householdId}/desk/sessions`;
const { sessionId } = await post<{ sessionId: string }>(desk, {
  patientMemberId: PATIENT,
  language: LANGUAGE,
  channel: 'live',
});
const FIXTURE = process.env.LIVE_FIXTURE ? `?fixture=${process.env.LIVE_FIXTURE}` : '';
await post(`${desk}/${sessionId}/captures:sample${FIXTURE}`);
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
  const timeout = setTimeout(() => {
    // Say what did arrive, so a silent model is distinguishable from a dead socket.
    const seen = got.map((m) => (m.type === 'caption' ? `caption(${m.role}:${m.text})` : m.type));
    reject(
      new Error(`timed out waiting for turnComplete; received: ${seen.join(' ') || 'nothing'}`),
    );
  }, TURN_TIMEOUT_MS);
  ws.onerror = () => reject(new Error('socket error'));
  ws.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as LiveServerMessage;
    got.push(message);
    if (message.type === 'ready') {
      ws.send(JSON.stringify({ type: 'hello', language: LANGUAGE, sampleRate: 16000 }));
      // MIC_TEXT types the question instead of speaking it: checks the tool loop and the
      // spoken answer without depending on speech recognition.
      if (process.env.MIC_TEXT) {
        ws.send(JSON.stringify({ type: 'text', text: process.env.MIC_TEXT }));
        turnEndedAt = Date.now();
        return;
      }
      // Paced like a microphone: one 40 ms chunk every 40 ms, then the end of the turn.
      const chunks = micChunks();
      const pump = setInterval(() => {
        const data = chunks.shift();
        if (data !== undefined) return ws.send(JSON.stringify({ type: 'audio', data }));
        clearInterval(pump);
        ws.send(JSON.stringify({ type: 'audioEnd' }));
        turnEndedAt = Date.now();
      }, 40);
    }
    if (message.type === 'audio') firstAudioMs ??= Date.now() - turnEndedAt;
    if (message.type === 'error') reject(new Error(`server error ${message.code}`));
    // A real model completes a turn after each tool call and card; the answer is the turn
    // that carried spoken audio, so earlier turns are waited through.
    if (message.type === 'turnComplete' && got.some((m) => m.type === 'audio')) {
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
