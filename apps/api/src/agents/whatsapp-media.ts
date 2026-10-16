import { Locale } from '@kavach/schemas';
import { z } from 'zod';
import { env } from '../env';
import { generateStructured, models } from '../lib/gemini';

const VoiceNote = z.object({
  /** Verbatim, in the script the speaker used (Devanagari for Hindi). */
  transcript: z.string(),
  language: Locale,
  /** False when the note is not about insurance, hospitals, policies or claims. */
  onTopic: z.boolean(),
});
export type VoiceNote = z.infer<typeof VoiceNote>;

const VOICE_PROMPT = `You transcribe WhatsApp voice notes sent to Kavach, an Indian family insurance helper.
Write exactly what was said, in Devanagari for Hindi and Latin script for English; keep English
insurance words (room, policy, TPA, cashless) as spoken. Set language to "hi" or "en".
Set onTopic to true when the note is about a hospital, an estimate, health insurance, a policy or a claim.`;

/** Gemini audio understanding for an inbound voice note (OGG/Opus). */
export function understandVoiceNote(audio: { data: Buffer; mimeType: string }): Promise<VoiceNote> {
  return generateStructured({
    model: models.flash,
    schema: VoiceNote,
    systemInstruction: VOICE_PROMPT,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: audio.data.toString('base64'), mimeType: audio.mimeType } },
          { text: 'Transcribe this voice note.' },
        ],
      },
    ],
    fixture: 'whatsapp-voice-note',
  });
}

const MediaKind = z.object({ kind: z.enum(['hospital_estimate', 'settlement_letter', 'other']) });
export type MediaKind = z.infer<typeof MediaKind>['kind'];

const CLASSIFY_PROMPT = `Classify the document in these photos or PDF pages sent on WhatsApp:
hospital_estimate (a hospital's cost estimate before admission, often by room category),
settlement_letter (an insurer or TPA claim settlement or deduction letter), or other.`;

/**
 * Is a photo or PDF a hospital estimate or a claim settlement letter? With FAKE_LLM=1 the
 * recorded answer is picked from the caption or file name ("settlement", "claim", "दावा").
 */
export async function classifyMedia(
  files: { data: Buffer; mimeType: string; filename?: string }[],
  hint: string,
): Promise<MediaKind> {
  const text = `${hint} ${files.map((f) => f.filename ?? '').join(' ')}`;
  const settlement = /settle|claim|deduction|letter|दावा|क्लेम|सेटलमेंट/i.test(text);
  const { kind } = await generateStructured({
    model: models.flash,
    schema: MediaKind,
    systemInstruction: CLASSIFY_PROMPT,
    contents: [
      {
        role: 'user',
        parts: [
          ...files.map((f) => ({
            inlineData: { data: f.data.toString('base64'), mimeType: f.mimeType },
          })),
          { text: hint ? `The sender wrote: ${hint}` : 'No caption.' },
        ],
      },
    ],
    fixture: env.FAKE_LLM && settlement ? 'whatsapp-media-settlement' : 'whatsapp-media-estimate',
  });
  return kind;
}
