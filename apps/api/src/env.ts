import { resolve } from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';
import { repoRoot } from './paths';

// One .env at the repo root serves both apps.
config({ path: resolve(repoRoot, '.env'), quiet: true });

const flag = z
  .enum(['0', '1', 'true', 'false'])
  .default('0')
  .transform((v) => v === '1' || v === 'true');

const Env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  PUBLIC_WEB_URL: z.string().default('http://localhost:3000'),
  PUBLIC_API_URL: z.string().default('http://localhost:8080'),
  FAKE_LLM: flag,
  AUTH_DISABLED: flag,
  DEMO_ADMIN_KEY: z.string().default('change-me'),

  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default('asia-south1'),
  KAVACH_MODEL_PRO: z.string().default('gemini-pro-latest-placeholder'),
  KAVACH_MODEL_FLASH: z.string().default('gemini-flash-latest-placeholder'),
  KAVACH_MODEL_LIVE: z.string().default('gemini-live-native-audio-placeholder'),
  KAVACH_MODEL_TTS: z.string().default('gemini-tts-placeholder'),
  KAVACH_MODEL_EMBED: z.string().default('gemini-embedding-placeholder'),
  KAVACH_LIVE_VOICE: z.string().default('voice-name-placeholder'),

  STORE: z.enum(['memory', 'firestore']).default('memory'),
  GCS_BUCKET: z.string().optional(),

  META_WHATSAPP_TOKEN: z.string().optional(),
  META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
});

// Treat empty strings in .env as "not set".
const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));

export const env = Env.parse(raw);
export type AppEnv = typeof env;
