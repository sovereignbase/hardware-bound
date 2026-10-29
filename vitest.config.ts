import { defineConfig } from 'vitest/config'

/** Runs the TypeScript unit and integration suites with V8 coverage. */
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    reporters: ['default', 'json'],
    outputFile: { json: 'test/.results/vitest.json' },
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportOnFailure: true,
      thresholds: {
        perFile: true,
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
})
