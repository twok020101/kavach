import type { BillingType, Locale } from '@kavach/schemas';

/**
 * Simple keyword reading of what the family typed or said. The desk core needs only two things
 * from an utterance: which language to answer in, and whether it answers the desk question.
 */

const DEVANAGARI = /[\u0900-\u097F]/;
const HINGLISH =
  /\b(kya|kaun|kaunsa|kitna|kitne|kitni|hai|hain|lein|lena|kamra|kamre|paise|batao|bataiye|chahiye|nahi|nahin|haan|mein|wala|wali|wale|abhi|kaise|kyun|karna|kare|karein)\b/i;
const ENGLISH =
  /\b(which|what|how|should|the|is|are|can|will|does|room|pay|cost|much|why|policy)\b/i;

/** Hindi when the text is in Devanagari or uses common Hindi words; English when it reads as English. */
export function detectLocale(text: string | undefined, fallback: Locale): Locale {
  if (!text?.trim()) return fallback;
  if (DEVANAGARI.test(text) || HINGLISH.test(text)) return 'hi';
  if (ENGLISH.test(text)) return 'en';
  return fallback;
}

const SAME = [
  /\bsame\b/i,
  /\bflat\b/i,
  /\bek\s*(hi|jaisa|jaise|jaisi)\b/i,
  /\bbarabar\b/i,
  /एक (ही|जैसे|जैसा|जैसी)/,
  /बराबर/,
  /सेम/,
];
const DIFFERENT = [/\bdifferent\b/i, /\bdiffer/i, /\balag\b/i, /\bbadal/i, /अलग/, /बदल/];
const PACKAGE = [/\bpackage\b/i, /पैकेज/];

/** The family's answer to "are the charges the same in every room?", if the text gives one. */
export function detectBillingAnswer(text: string | undefined): BillingType | undefined {
  if (!text) return undefined;
  const has = (patterns: RegExp[]) => patterns.some((p) => p.test(text));
  if (has(PACKAGE)) return 'package';
  // "alag nahi" / "not different" means the same.
  if (/\b(alag|different)\s+(nahi|nahin|not)\b|\bnot\s+different\b|अलग नहीं/i.test(text))
    return 'flat';
  if (has(DIFFERENT)) return 'differential';
  if (has(SAME)) return 'flat';
  return undefined;
}
