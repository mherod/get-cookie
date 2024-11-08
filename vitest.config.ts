import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@browsers': resolve(__dirname, './src/browsers'),
      '@db': resolve(__dirname, './src/db'),
      '@types': resolve(__dirname, './src/types.ts'),
      '@utils': resolve(__dirname, './src/utils')
    }
  },
  test: {
    root: './src',
    environment: 'node',
    include: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
    coverage: {
      reporter: ['lcov', 'text-summary']
    },
    globals: true
  }
});