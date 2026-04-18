import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      'shared': path.resolve(__dirname, '../shared'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});
