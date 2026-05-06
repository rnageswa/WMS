import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.{test,spec}.{js,mjs,ts,mts}'],
    setupFiles: ['./__tests__/setup.ts'],
  },
});