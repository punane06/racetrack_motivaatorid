import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./client/src', import.meta.url)) },
      { find: '@shared', replacement: fileURLToPath(new URL('./shared', import.meta.url)) },
    ],
  },
  test: {
    projects: [
      {
        // Client tests
        test: {
          include: ['client/src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['client/setupTests.ts'],
        },
      },
      {
        // Server tests
        test: {
          include: ['server/src/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
})

