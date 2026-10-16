import { resolve } from 'node:path';

// This file sits one level below the app root both in src/ (dev) and once bundled
// into dist/ (production), so paths built from here work in both.
export const appRoot = resolve(import.meta.dirname, '..');
export const repoRoot = resolve(appRoot, '../..');
