/**
 * Downloads the public policy wordings in data/wordings/manifest.yaml into data/wordings/pdfs/
 * (git-ignored) and checks each file's SHA-256 against the manifest.
 *
 *   pnpm wordings:fetch            # skips files already downloaded
 *   pnpm wordings:fetch --force    # downloads again
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { hasPdf, loadManifest, pdfPath } from '../evals/wordings';

const force = process.argv.includes('--force');

async function main() {
  let failed = 0;
  for (const w of await loadManifest()) {
    const file = pdfPath(w.uin);
    try {
      if (force || !(await hasPdf(w.uin))) {
        const response = await fetch(w.url, {
          headers: { 'user-agent': 'Mozilla/5.0 (Kavach evals)' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('not a PDF');
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, bytes);
      }
      const sha = createHash('sha256')
        .update(await readFile(file))
        .digest('hex');
      const check = !w.sha256
        ? 'new: copy sha256 into the manifest'
        : w.sha256 === sha
          ? 'ok'
          : 'CHANGED since labelled';
      console.log(`${w.uin}  ${sha}  ${check}`);
    } catch (error) {
      failed++;
      console.error(`${w.uin}  FAILED (${(error as Error).message})  ${w.url}`);
    }
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
