/**
 * Renders the sample documents in templates/ to data/samples/ as PDF and PNG.
 * Run from the repo root with `pnpm samples`.
 */
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Browser } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const templates = join(here, 'templates');
const outDir = resolve(here, '../../data/samples');

/** Templates to render; output files take the same name. */
const documents = [
  'city-heart-estimate',
  'suraksha-settlement-letter',
  'acme-benefits-summary',
  'parents-policy-schedule',
  'supertopup-schedule',
  'lotus-maternity-estimate',
  'lotus-maternity-settlement-letter',
  'sample-general-sg-estimate',
];

/** `pnpm samples <name>` renders one document (and its photo) instead of all of them. */
const only = process.argv[2];
const wanted = (name: string) => !only || name === only;

/** Chromium from CHROMIUM_PATH, else the newest one under PLAYWRIGHT_BROWSERS_PATH or /opt/pw-browsers. */
function findChromium(): string | undefined {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  const dirs = readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .reverse();
  for (const d of dirs) {
    const exe = join(root, d, 'chrome-linux', 'chrome');
    if (existsSync(exe)) return exe;
  }
  return undefined;
}

/** PDF of the whole document, plus one PNG per page (name.png, or name-p1.png… when several). */
async function renderDocument(browser: Browser, name: string): Promise<void> {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(join(templates, `${name}.html`)).href);
  await page.pdf({
    path: join(outDir, `${name}.pdf`),
    preferCSSPageSize: true,
    printBackground: true,
  });

  const sheets = await page.locator('.page').all();
  for (const [i, sheet] of sheets.entries()) {
    const file = sheets.length === 1 ? `${name}.png` : `${name}-p${i + 1}.png`;
    await sheet.screenshot({ path: join(outDir, file) });
  }
  await page.close();
  console.log(`  ${name}: pdf + ${sheets.length} png`);
}

/** A phone-camera look for the estimate: tilted sheet on a desk, warm light, soft shadow. */
async function renderPhoto(browser: Browser, source: string, target: string): Promise<void> {
  const png = await readFile(join(outDir, source));
  const html = `<!doctype html><html><body style="margin:0">
    <div style="width:1100px;height:1450px;display:flex;align-items:center;justify-content:center;
      background:radial-gradient(ellipse at 30% 20%,#a07a52,#5e4128 75%);overflow:hidden">
      <img src="data:image/png;base64,${png.toString('base64')}" style="width:900px;
        transform:rotate(-1.5deg);
        box-shadow:18px 26px 40px rgba(0,0,0,.55);
        filter:sepia(.22) saturate(1.05) brightness(.96) contrast(.95)">
      <div style="position:absolute;inset:0;pointer-events:none;
        background:linear-gradient(115deg,rgba(255,236,200,.18),rgba(0,0,0,.22))"></div>
    </div></body></html>`;
  const page = await browser.newPage({ viewport: { width: 1100, height: 1450 } });
  await page.setContent(html);
  await page.screenshot({ path: join(outDir, target) });
  await page.close();
  console.log(`  ${target}: photo variant of ${source}`);
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: findChromium() });
  try {
    console.log(`Rendering samples to ${outDir}`);
    for (const name of documents.filter(wanted)) await renderDocument(browser, name);
    for (const name of [
      'city-heart-estimate',
      'lotus-maternity-estimate',
      'sample-general-sg-estimate',
    ]) {
      if (wanted(name)) await renderPhoto(browser, `${name}.png`, `${name}-photo.png`);
    }
  } finally {
    await browser.close();
  }
}

await main();
