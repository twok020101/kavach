import { defineConfig } from 'tsup';

// Bundle the API and the workspace packages it imports into one ESM file.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  noExternal: [/^@kavach\//],
  clean: true,
  sourcemap: true,
});
