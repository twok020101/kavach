import {
  LiveClientMessage,
  type LiveErrorCode,
  type LiveServerMessage,
  type Locale,
} from '@kavach/schemas';
import { deskLiveInstruction } from '../agents/desk-live';
import { env } from '../env';
import type { BackendOptions, LiveBackend } from './backend';
import { fakeLive } from './fake-live';
import { connectGeminiLive } from './gemini-live';
import type { DeskPort } from './port';
import { deskTools } from './tools';

/** Judging cap per live session (red-team-response §3); after it the desk goes to text mode. */
const MAX_SESSION_MS = 5 * 60_000;

/** Per desk session, kept across browser reconnects: the resumption handle and the start time. */
const resumable = new Map<string, { handle?: string; startedAt: number }>();

/**
 * One browser socket ⇄ one live model session. Knows nothing about Fastify or the store:
 * it gets a desk port, a `send` and a `close`, so it can run in another service unchanged.
 */
export async function openLiveBridge(opts: {
  sessionId: string;
  language: Locale;
  port: DeskPort;
  send: (message: LiveServerMessage) => void;
  close: () => void;
  log: (message: string) => void;
}) {
  const { sessionId, send } = opts;
  let language = opts.language;
  let backend: LiveBackend | undefined;
  let ended = false;

  const state = resumable.get(sessionId) ?? { startedAt: Date.now() };
  resumable.set(sessionId, state);

  function fail(code: LiveErrorCode, reason?: string) {
    if (ended) return;
    if (reason) opts.log(`live ${sessionId}: ${code}: ${reason}`);
    send({ type: 'error', code, fallback: 'text' });
    stop();
  }

  function stop() {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    backend?.close();
    opts.close();
  }

  const remaining = MAX_SESSION_MS - (Date.now() - state.startedAt);
  const timer = setTimeout(() => fail('time_limit'), Math.max(0, remaining));
  if (remaining <= 0) return { receive: () => {}, stop };

  const backendOptions: BackendOptions = {
    systemInstruction: deskLiveInstruction(await opts.port.context(), language),
    language,
    runTool: deskTools(
      opts.port,
      (m) => !ended && send(m),
      () => language,
    ),
    emit: (m) => !ended && send(m),
    resumeHandle: state.handle,
    onResumeHandle: (handle) => (state.handle = handle),
    onFatal: (reason) => fail('model_unavailable', reason),
  };

  try {
    backend = env.FAKE_LLM ? fakeLive(backendOptions) : await connectGeminiLive(backendOptions);
  } catch (error) {
    fail('model_unavailable', String(error));
    return { receive: () => {}, stop };
  }
  send({ type: 'ready', sessionId, resumable: true });

  function receive(raw: string) {
    if (ended || !backend) return;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      json = undefined;
    }
    const parsed = LiveClientMessage.safeParse(json);
    if (!parsed.success) {
      send({ type: 'error', code: 'bad_message' });
      return;
    }
    const message = parsed.data;
    switch (message.type) {
      case 'hello':
        if (message.language && message.language !== language) {
          language = message.language;
          backend.setLanguage(language);
        }
        return;
      case 'audio':
        return backend.audio(message.data);
      case 'audioEnd':
        return backend.audioEnd();
      case 'text':
        return backend.text(message.text);
      case 'capture':
        return backend.capture();
      case 'billingAnswer':
        return backend.billingAnswer(message.billingType);
      case 'setLanguage':
        language = message.language;
        return backend.setLanguage(language);
      case 'ping':
        return send({ type: 'pong' });
      case 'end':
        resumable.delete(sessionId);
        send({ type: 'ended' });
        return stop();
    }
  }

  return { receive, stop };
}
