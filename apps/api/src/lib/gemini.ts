import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { GoogleGenAI, type ContentListUnion } from '@google/genai';
import { z } from 'zod';
import { env } from '../env';
import { appRoot } from '../paths';

let client: GoogleGenAI | undefined;

/** The Gemini client on Vertex AI. Only created when a real call is made. */
export function genai(): GoogleGenAI {
  client ??= new GoogleGenAI({
    vertexai: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
  });
  return client;
}

let liveClient: GoogleGenAI | undefined;

/** The client for Gemini Live sessions, which may live in a different region (`GOOGLE_CLOUD_LIVE_LOCATION`). */
export function genaiLive(): GoogleGenAI {
  const location = env.GOOGLE_CLOUD_LIVE_LOCATION ?? env.GOOGLE_CLOUD_LOCATION;
  if (location === env.GOOGLE_CLOUD_LOCATION) return genai();
  liveClient ??= new GoogleGenAI({ vertexai: true, project: env.GOOGLE_CLOUD_PROJECT, location });
  return liveClient;
}

export const models = {
  pro: env.KAVACH_MODEL_PRO,
  flash: env.KAVACH_MODEL_FLASH,
  live: env.KAVACH_MODEL_LIVE,
  tts: env.KAVACH_MODEL_TTS,
  embed: env.KAVACH_MODEL_EMBED,
} as const;

const fixturesDir = resolve(appRoot, 'fixtures');

/**
 * Ask Gemini for JSON that matches a Zod schema, and parse it.
 *
 * With FAKE_LLM=1 it returns `fixtures/<fixture>.json` instead, so every
 * screen and flow can run without a Google key.
 */
export async function generateStructured<S extends z.ZodType>(opts: {
  model: string;
  schema: S;
  contents: ContentListUnion;
  systemInstruction?: string;
  fixture: string;
  /**
   * Turns the model's raw JSON into a value the schema accepts, when a plain parse fails.
   * Used where the model may legitimately return something off-schema (a photo that is not
   * an estimate) and a friendly result beats a 500.
   */
  repair?: (raw: unknown, issues: z.ZodError) => z.infer<S>;
}): Promise<z.infer<S>> {
  const parse = (raw: unknown): z.infer<S> => {
    const result = opts.schema.safeParse(raw);
    if (result.success) return result.data;
    if (opts.repair) return opts.repair(raw, result.error);
    throw result.error;
  };
  if (env.FAKE_LLM) {
    const raw = await readFile(resolve(fixturesDir, `${opts.fixture}.json`), 'utf8');
    return parse(JSON.parse(raw));
  }

  const call = () =>
    genai().models.generateContent({
      model: opts.model,
      contents: opts.contents,
      config: {
        systemInstruction: opts.systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(opts.schema, { io: 'input' }),
      },
    });
  const response = await withOneRetryOn429(call);
  if (!response.text) throw new Error(`Empty response from ${opts.model}`);
  return parse(JSON.parse(response.text));
}

/**
 * Preview models carry small per-minute quotas, and two quick desk captures can trip them.
 * A 429 from Vertex is retried once after a short wait; anything else is thrown as is.
 */
async function withOneRetryOn429<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!is429(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return call();
  }
}

const is429 = (error: unknown) => {
  if (typeof error !== 'object' || error === null) return false;
  const { status, message } = error as { status?: unknown; message?: unknown };
  return status === 429 || (typeof message === 'string' && message.includes('"code":429'));
};
