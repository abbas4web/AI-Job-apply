import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@ai-job-apply/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    testTimeout: 15_000,
    // Map the CJS pdf-parse bundle to our mock for all test files
    server: {
      deps: {
        inline: ['pdf-parse'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/**/*.d.ts'],
    },
  },
});
