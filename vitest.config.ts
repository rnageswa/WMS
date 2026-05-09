import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    includeSource: ['src/**/*.{ts,tsx}'],
    globals: true,
  },
});