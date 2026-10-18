import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SettlementLetter } from '@kavach/schemas';
import { z } from 'zod';
import { generateStructured, models, quickLocation } from '../lib/gemini';
import { appRoot } from '../paths';

const prompt = readFileSync(resolve(appRoot, 'src/agents/prompts/claim-letter-reader.md'), 'utf8');

const Classification = z.object({
  isSettlementLetter: z.boolean(),
  /** What the document is instead, in a few words. */
  description: z.string(),
});

/**
 * A quick look (Flash) at whether the upload is a claim settlement letter at all, so a plan
 * brochure, an estimate or an ID card is refused in seconds instead of after a full read.
 */
export async function classifyClaimDocument(
  file: { bytes: Buffer; mimeType: string },
  { fixture = 'claim-letter-kind' }: { fixture?: string } = {},
) {
  return generateStructured({
    model: models.quick,
    location: quickLocation,
    schema: Classification,
    systemInstruction:
      'You look at one document and say whether it is a letter from an insurer or TPA about a health insurance claim: a settlement advice, claim approval, partial approval, discharge approval, repudiation or rejection letter, or a query letter about a claim, usually with a claim number. A policy brochure or plan, a hospital estimate, a policy schedule, an ID card or a photo that is not a document is not one. Describe what the document is in a few words.',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: file.mimeType, data: file.bytes.toString('base64') } },
          { text: 'Is this a claim settlement letter?' },
        ],
      },
    ],
    fixture,
  });
}

/** ClaimLetterReader (docs/plan/03 §4.7): a settlement letter photo or PDF → SettlementLetter. */
export async function readSettlementLetter(
  file: { bytes: Buffer; mimeType: string },
  { fixture = 'claim-letter-cx1' }: { fixture?: string } = {},
) {
  return generateStructured({
    model: models.pro,
    schema: SettlementLetter,
    systemInstruction: prompt,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: file.mimeType, data: file.bytes.toString('base64') } },
          { text: 'Read this claim settlement letter.' },
        ],
      },
    ],
    fixture,
  });
}
