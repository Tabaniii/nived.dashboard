import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // Next.js supplies this marker; tests run trusted server modules in Node.
      'server-only': path.resolve(import.meta.dirname, './node_modules/next/dist/compiled/server-only/empty.js'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
