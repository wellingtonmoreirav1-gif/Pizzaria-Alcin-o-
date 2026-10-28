import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'tests/db/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    fileParallelism: false,
    // Cobertura: npm run test:coverage (relatório em coverage/, enviado ao Codecov no CI).
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'app/api/**/*.ts', 'instrumentation.ts'],
      exclude: ['**/*.d.ts'],
      reporter: ['text-summary', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
});
