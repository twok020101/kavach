/** Reads the wording manifest and labels (data/wordings). Shared by the fetch, ingest and eval scripts. */
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { WordingLabel, WordingManifest, type WordingEntry } from '@kavach/schemas';
import { parse } from 'yaml';
import { repoRoot } from '../apps/api/src/paths';

export const wordingsDir = resolve(repoRoot, 'data/wordings');
export const manifestFile = resolve(wordingsDir, 'manifest.yaml');

export async function loadManifest(): Promise<WordingEntry[]> {
  return WordingManifest.parse(parse(await readFile(manifestFile, 'utf8'))).wordings;
}

/** Fetched PDFs live in a git-ignored folder. */
export const pdfPath = (uin: string) => resolve(wordingsDir, 'pdfs', `${uin}.pdf`);

export async function hasPdf(uin: string) {
  return access(pdfPath(uin)).then(
    () => true,
    () => false,
  );
}

export async function loadLabel(uin: string): Promise<WordingLabel> {
  const raw = await readFile(resolve(wordingsDir, 'labels', `${uin}.json`), 'utf8');
  return WordingLabel.parse(JSON.parse(raw));
}
