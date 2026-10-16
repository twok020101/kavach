import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Household } from '@kavach/schemas';
import { repoRoot } from '../paths';
import { addDocument } from './service';

/** The Sharma family's three insurance documents in data/samples (S07 "Use sample documents"). */
export const SAMPLE_DOCUMENTS = [
  'acme-benefits-summary.pdf',
  'parents-policy-schedule.pdf',
  'supertopup-schedule.pdf',
];

const samplesDir = resolve(repoRoot, 'data/samples');

export async function addSampleDocuments(household: Household) {
  const documents = [];
  for (const filename of SAMPLE_DOCUMENTS) {
    const bytes = await readFile(resolve(samplesDir, filename));
    documents.push(
      await addDocument(household, {
        filename,
        mimeType: 'application/pdf',
        bytes,
        isSample: true,
      }),
    );
  }
  return documents;
}
