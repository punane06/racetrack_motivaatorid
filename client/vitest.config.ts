import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const rootDir = __dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@shared': path.resolve(rootDir, '../shared'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['setupTests.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'src/__tests__/*.test.{ts,tsx}', 'src/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
