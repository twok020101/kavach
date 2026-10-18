import type { BillingType, Locale, RoomCategory } from '@kavach/schemas';

/**
 * Simple keyword reading of what the family typed or said. The desk core needs only two things
 * from an utterance: which language to answer in, and whether it answers the desk question.
 */

const DEVANAGARI = /[\u0900-\u097F]/;
const TAMIL = /[\u0B80-\u0BFF]/;
const HAN = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
// Malay is Latin-script; a few function words that English does not share tell it apart.
const MALAY =
  /\b(bilik|boleh|berapa|yang|mana|saya|kami|hospital|bayar|patut|tidak|adakah|untuk|dengan|ini|itu|wad|tuntutan)\b/i;
const HINGLISH =
  /\b(kya|kaun|kaunsa|kitna|kitne|kitni|hai|hain|lein|lena|kamra|kamre|paise|batao|bataiye|chahiye|nahi|nahin|haan|mein|wala|wali|wale|abhi|kaise|kyun|karna|kare|karein)\b/i;
const ENGLISH =
  /\b(which|what|how|should|the|is|are|can|will|does|room|pay|cost|much|why|policy)\b/i;

/** Hindi when the text is in Devanagari or uses common Hindi words; English when it reads as English. */
export function detectLocale(text: string | undefined, fallback: Locale): Locale {
  if (!text?.trim()) return fallback;
  if (DEVANAGARI.test(text) || HINGLISH.test(text)) return 'hi';
  if (TAMIL.test(text)) return 'ta';
  if (HAN.test(text)) return 'zh';
  if (ENGLISH.test(text)) return 'en';
  if (MALAY.test(text)) return 'ms';
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

/** Words people use for each kind of room, in English, Hinglish and Hindi. */
const ROOM_WORDS: [RegExp, RegExp][] = [
  // [matches the room's label, matches the utterance]
  [/general|ward/i, /\bgeneral\b|\bward\b|जनरल|वार्ड/i],
  [/twin|sharing|double|two[- ]bed/i, /\btwin\b|\bsharing\b|\bdouble\b|\bdo\s*bed|शेयरिंग|डबल/i],
  [/non[- ]?ac/i, /\bnon[- ]?ac\b|\bbina\s*ac\b|नॉन[- ]?एसी|बिना\s*एसी/i],
  [/(?<!non[- ])(?<!non)\bac\b/i, /(?<!non[- ])(?<!non)\bac\b|\ba\/c\b|(?<!नॉन[- ])एसी/i],
  [/deluxe/i, /\bdeluxe\b|डीलक्स/i],
  [/suite/i, /\bsuite\b|सुइट/i],
  [/single/i, /\bsingle\b|\bakela\b|सिंगल/i],
  [/private/i, /\bprivate\b|प्राइवेट/i],
];

/**
 * The room category the family named in what they typed or said, if any: "can we take the twin
 * sharing?", "AC wala kamra", "जनरल वार्ड". The most specific match wins (non-AC before AC).
 */
export function detectRoomMention(
  text: string | undefined,
  rooms: RoomCategory[],
): RoomCategory | undefined {
  if (!text?.trim()) return undefined;
  for (const [labelPattern, utterancePattern] of ROOM_WORDS) {
    if (!utterancePattern.test(text)) continue;
    const room = rooms.find((r) => labelPattern.test(r.label));
    if (room) return room;
  }
  return undefined;
}

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
