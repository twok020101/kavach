import {
  ActivityHandling,
  EndSensitivity,
  Modality,
  StartSensitivity,
  type LiveServerMessage as GeminiMessage,
  type Session,
} from '@google/genai';
import { deskLiveTools } from '../agents/desk-live';
import { env } from '../env';
import { genaiLive, models } from '../lib/gemini';
import { notes, type BackendOptions, type LiveBackend } from './backend';

/**
 * The bridge to a Gemini Live session (Vertex, audio out). Audio and app notes go in; audio,
 * transcriptions and tool calls come back. Tool calls run through `runTool`, so every amount
 * comes from the desk core. On GoAway or a dropped model socket it reconnects with the latest
 * session-resumption handle, without the browser noticing.
 */
export async function connectGeminiLive(opts: BackendOptions): Promise<LiveBackend> {
  let session: Session | undefined;
  let handle = opts.resumeHandle;
  let closed = false;
  let reconnecting = false;
  // Transcription arrives in pieces; captions show the turn so far.
  let userText = '';
  let agentText = '';
  // Each connect() gets a generation number, so a close or error from an older model socket
  // (replaced by a reconnect) is ignored, while one from the socket being opened is handled.
  // Checking the session object itself would throw if the socket closes mid-handshake,
  // before `connect` has returned it.
  let generation = 0;

  /**
   * Opens one model socket. Settles only once the handshake is complete: a close or an error
   * before that rejects, because the SDK's own promise would otherwise wait forever (issue #22),
   * and a stale resume handle or a wrong region must never leave the family in silence.
   */
  function connect(): Promise<void> {
    const mine = ++generation;
    let ready = false;
    return new Promise<void>((resolve, reject) => {
      genaiLive()
        .live.connect({
          model: models.live,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: opts.systemInstruction,
            tools: [{ functionDeclarations: deskLiveTools }],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: env.KAVACH_LIVE_VOICE } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            // A hospital corridor is loud: start a turn only on clear speech, and wait a little
            // longer before deciding the person has finished.
            realtimeInputConfig: {
              automaticActivityDetection: {
                startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
                endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
                prefixPaddingMs: 300,
                silenceDurationMs: 900,
              },
              activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
            },
            sessionResumption: { handle },
            contextWindowCompression: { slidingWindow: {} },
          },
          callbacks: {
            onmessage: (message) => void onMessage(message),
            onerror: (event) => {
              if (closed || mine !== generation) return;
              if (!ready) reject(new Error(`Gemini Live error during handshake: ${event.message}`));
              else opts.onFatal(`Gemini Live error: ${event.message}`);
            },
            onclose: (event) => {
              if (closed || mine !== generation) return;
              if (!ready) {
                reject(
                  new Error(`Gemini Live closed during handshake: ${event.code} ${event.reason}`),
                );
                return;
              }
              if (handle) void reconnect();
              else opts.onFatal(`Gemini Live closed: ${event.code} ${event.reason}`);
            },
          },
        })
        .then((next) => {
          // A socket that finished its handshake after being replaced is closed, not adopted.
          if (closed || mine !== generation) {
            next.close();
            return;
          }
          ready = true;
          session = next;
          resolve();
        }, reject);
    });
  }

  /** Connects with the resume handle; if that handshake fails, drops the handle and tries once fresh. */
  async function open() {
    try {
      await connect();
    } catch (error) {
      if (!handle) throw error;
      handle = undefined;
      await connect();
    }
  }

  async function reconnect() {
    if (reconnecting || closed) return;
    reconnecting = true;
    const old = session;
    try {
      await open();
      old?.close();
    } catch (error) {
      opts.onFatal(`Gemini Live reconnect failed: ${String(error)}`);
    } finally {
      reconnecting = false;
    }
  }

  async function onMessage(message: GeminiMessage) {
    const update = message.sessionResumptionUpdate;
    if (update?.resumable && update.newHandle) {
      handle = update.newHandle;
      opts.onResumeHandle(handle);
    }
    if (message.goAway) void reconnect();

    const content = message.serverContent;
    if (content) {
      for (const part of content.modelTurn?.parts ?? []) {
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
          opts.emit({ type: 'audio', data: part.inlineData.data });
        }
      }
      if (content.inputTranscription?.text) {
        userText += content.inputTranscription.text;
        opts.emit({ type: 'caption', role: 'user', text: userText.trim(), final: false });
      }
      if (content.outputTranscription?.text) {
        // The agent started answering, so the person's turn is over.
        if (userText) finishCaption('user');
        agentText += content.outputTranscription.text;
        opts.emit({ type: 'caption', role: 'agent', text: agentText.trim(), final: false });
      }
      if (content.interrupted) opts.emit({ type: 'interrupted' });
      if (content.turnComplete) {
        finishCaption('user');
        finishCaption('agent');
        opts.emit({ type: 'turnComplete' });
      }
    }

    const calls = message.toolCall?.functionCalls ?? [];
    if (calls.length) {
      const functionResponses = await Promise.all(
        calls.map(async (call) => ({
          id: call.id,
          name: call.name,
          response: { output: await opts.runTool(call.name ?? '', call.args ?? {}) },
        })),
      );
      if (!closed) session?.sendToolResponse({ functionResponses });
    }
  }

  function finishCaption(role: 'user' | 'agent') {
    const text = (role === 'user' ? userText : agentText).trim();
    if (text) opts.emit({ type: 'caption', role, text, final: true });
    if (role === 'user') userText = '';
    else agentText = '';
  }

  const note = (text: string) =>
    session?.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
      turnComplete: true,
    });

  await open();

  return {
    audio: (data) =>
      session?.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } }),
    audioEnd: () => session?.sendRealtimeInput({ audioStreamEnd: true }),
    text: (text) => {
      opts.emit({ type: 'caption', role: 'user', text, final: true });
      note(text);
    },
    capture: () => note(notes.capture),
    billingAnswer: (billingType) => note(notes.billing(billingType)),
    setLanguage: (language) => note(notes.language(language)),
    close() {
      closed = true;
      session?.close();
    },
  };
}
