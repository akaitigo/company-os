import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'modules/**/*.test.ts', 'packages/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['modules/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
});
