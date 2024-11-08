import { defineConfig } from 'vitest/config';
import CustomReporter from './src/test/CustomReporter';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    setupFiles: ['./src/__mocks__/bun-sqlite.ts'],
    mockReset: true,
    deps: {
      inline: [/bun:sqlite/]
    },
    reporters: [new CustomReporter(), 'default'] as const,
  },
});