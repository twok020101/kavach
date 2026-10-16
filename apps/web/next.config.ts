import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// One .env at the repo root serves both apps.
loadEnvConfig(resolve(import.meta.dirname, '../..'));

const nextConfig: NextConfig = {
  transpilePackages: ['@kavach/schemas', '@kavach/engine'],
  // Messages are read from disk at request time (src/i18n/request.ts); ship them with the server.
  outputFileTracingIncludes: { '/*': ['./messages/**/*'] },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
