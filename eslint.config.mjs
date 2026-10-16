import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Shared lint rules for the API and packages. The web app has its own config (Next.js rules).
export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', 'apps/web/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
