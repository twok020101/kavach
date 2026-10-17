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
}): Promise<z.infer<S>> {
  if (env.FAKE_LLM) {
    const raw = await readFile(resolve(fixturesDir, `${opts.fixture}.json`), 'utf8');
    return opts.schema.parse(JSON.parse(raw));
  }

  const response = await genai().models.generateContent({
    model: opts.model,
    contents: opts.contents,
    config: {
      systemInstruction: opts.systemInstruction,
      responseMimeType: 'application/json',
      responseJsonSchema: z.toJSONSchema(opts.schema, { io: 'input' }),
    },
  });
  if (!response.text) throw new Error(`Empty response from ${opts.model}`);
  return opts.schema.parse(JSON.parse(response.text));
}
