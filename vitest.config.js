import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
    hookTimeout: 90000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['controllers/**', 'middleware/**'],
      exclude: ['**/*.test.js'],
    },
  },
});
