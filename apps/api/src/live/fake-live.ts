import type { BillingType, Locale } from '@kavach/schemas';
import type { BackendOptions, LiveBackend } from './backend';

/** What the fake "hears" when a spoken turn ends (the demo question). */
const HEARD: Record<Locale, string> = {
  hi: 'पापा के लिए कौन सा कमरा लें?',
  en: 'Which room should we take for Papa?',
};

const OUT_RATE = 24_000;
const FRAME_MS = 100;

/**
 * A stand-in for Gemini Live when FAKE_LLM=1. It speaks the same protocol and makes the same
 * tool calls a well-behaved model would (read_estimate → evaluate_options → emit_card), then
 * "speaks" the engine's `say` line: captions word by word and generated 24 kHz speech-like PCM.
 * A new turn while it is speaking interrupts it, like barge-in.
 */
export function fakeLive(opts: BackendOptions): LiveBackend {
  let language = opts.language;
  let heardChunks = 0;
  let speaking: AbortController | undefined;
  let queue = Promise.resolve();

  /** Runs turns one after another; a new turn interrupts the current speech first. */
  function turn(work: (signal: AbortSignal) => Promise<void>) {
    if (speaking) {
      speaking.abort();
      opts.emit({ type: 'interrupted' });
    }
    const controller = new AbortController();
    speaking = controller;
    queue = queue
      .then(() => work(controller.signal))
      .catch((error: unknown) => opts.onFatal(String(error)))
      .finally(() => {
        if (speaking === controller) speaking = undefined;
      });
  }

  async function answer(
    signal: AbortSignal,
    { question, billingTypeAnswer }: { question?: string; billingTypeAnswer?: BillingType } = {},
  ) {
    if (question) await caption('user', question, signal, 40);
    await opts.runTool('read_estimate');
    const reply = await opts.runTool('evaluate_options', { question, billingTypeAnswer });
    if (signal.aborted) return;
    if (typeof reply.say !== 'string') {
      throw new Error(`evaluate_options failed: ${String(reply.error)}`);
    }
    for (const card of (reply.cards as { id: string }[] | undefined) ?? []) {
      await opts.runTool('emit_card', { cardId: card.id });
    }
    await speak(reply.say, signal);
    if (!signal.aborted) opts.emit({ type: 'turnComplete' });
  }

  async function speak(text: string, signal: AbortSignal) {
    const words = text.split(/\s+/);
    const seconds = Math.min(7, Math.max(1.2, words.length * 0.28));
    const frames = Math.ceil((seconds * 1000) / FRAME_MS);
    for (let i = 0; i < frames && !signal.aborted; i++) {
      opts.emit({ type: 'audio', data: speechFrame(i).toString('base64') });
      const shown = Math.ceil(((i + 1) / frames) * words.length);
      const final = i === frames - 1;
      opts.emit({ type: 'caption', role: 'agent', text: words.slice(0, shown).join(' '), final });
      // Faster than real time, as the model sends audio ahead of playback.
      await sleep(FRAME_MS / 2);
    }
  }

  async function caption(role: 'user' | 'agent', text: string, signal: AbortSignal, ms: number) {
    const words = text.split(/\s+/);
    for (let i = 1; i <= words.length && !signal.aborted; i++) {
      opts.emit({
        type: 'caption',
        role,
        text: words.slice(0, i).join(' '),
        final: i === words.length,
      });
      await sleep(ms);
    }
  }

  return {
    audio() {
      heardChunks++;
    },
    audioEnd() {
      if (heardChunks === 0) return;
      heardChunks = 0;
      turn((signal) => answer(signal, { question: HEARD[language] }));
    },
    text: (text) => turn((signal) => answer(signal, { question: text })),
    capture: () => turn((signal) => answer(signal)),
    billingAnswer: (billingTypeAnswer) => turn((signal) => answer(signal, { billingTypeAnswer })),
    setLanguage(next) {
      language = next;
    },
    close() {
      speaking?.abort();
    },
  };
}

/** 100 ms of a soft, voice-like hum: a 170 Hz voice with harmonics, pulsed into syllables. */
function speechFrame(index: number): Buffer {
  const samples = (OUT_RATE * FRAME_MS) / 1000;
  const pcm = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = (index * samples + i) / OUT_RATE;
    const f0 = 170 + 15 * Math.sin(2 * Math.PI * 0.7 * t);
    const voice =
      Math.sin(2 * Math.PI * f0 * t) +
      0.5 * Math.sin(4 * Math.PI * f0 * t) +
      0.25 * Math.sin(6 * Math.PI * f0 * t);
    const syllable = Math.sin(Math.PI * 4 * t) ** 2;
    pcm.writeInt16LE(Math.round(voice * syllable * 0.12 * 32767), i * 2);
  }
  return pcm;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
