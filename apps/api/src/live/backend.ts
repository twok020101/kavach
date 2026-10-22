import type { BillingType, Locale } from '@kavach/schemas';
import { LANGUAGE_NAMES } from '../core/locales';
import type { Emit, RunTool } from './tools';

/** One live model session behind the browser socket: Gemini Live, or the fake for FAKE_LLM=1. */
export interface LiveBackend {
  /** Base64 PCM16 LE mono 16 kHz from the mic. */
  audio(data: string): void;
  /** The mic was muted: the end of the person's turn. */
  audioEnd(): void;
  text(text: string): void;
  /** A still of the estimate was uploaded through the captures endpoint. */
  capture(): void;
  billingAnswer(billingType: BillingType): void;
  setLanguage(language: Locale): void;
  close(): void;
}

export type BackendOptions = {
  systemInstruction: string;
  language: Locale;
  runTool: RunTool;
  emit: Emit;
  /** A session resumption handle from an earlier connection of the same desk session. */
  resumeHandle?: string;
  onResumeHandle(handle: string): void;
  /** The model session failed for good; the browser should fall back to text. */
  onFatal(reason: string): void;
};

/** App notes sent to the model as user turns; the prompt says bracketed lines are not speech. */
export const notes = {
  capture:
    '[capture] The estimate photo has been captured. Call read_estimate, then evaluate_options.',
  billing: (b: BillingType) =>
    `[billing answer] The desk says the billing type is "${b}". Call evaluate_options with billingTypeAnswer "${b}" and tell the family the result.`,
  language: (l: Locale) => `[language] Speak ${LANGUAGE_NAMES[l].english} from now on.`,
};
