import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SettlementLetter } from '@kavach/schemas';
import { generateStructured, models } from '../lib/gemini';
import { appRoot } from '../paths';

const prompt = readFileSync(resolve(appRoot, 'src/agents/prompts/claim-letter-reader.md'), 'utf8');

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
