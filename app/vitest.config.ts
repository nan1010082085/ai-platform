import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSharedSourceAliases } from '../../scripts/vite-shared-source.mjs'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(rootDir, 'src') },
      ...createSharedSourceAliases(import.meta.url, {
        platformShared: true,
      }),
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/stores/**', 'src/api/**'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/__tests__/**'],
      thresholds: {
        'src/stores/**': {
          lines: 70,
          functions: 70,
          statements: 70,
        },
        'src/api/**': {
          lines: 70,
          functions: 70,
          statements: 70,
        },
      },
    },
  },
})
