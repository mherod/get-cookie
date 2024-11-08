import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'node16',
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli.ts')
      },
      formats: ['cjs', 'es'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'js'}`
    },
    rollupOptions: {
      external: [
        /node:.*/,
        'path',
        'fs',
        'crypto',
        'child_process',
        'util',
        'fs/promises',
        'better-sqlite3',
        'consola',
        'cross-fetch',
        'destr',
        'fast-glob',
        'jsonwebtoken',
        'lodash',
        'lodash-es',
        'lru-cache',
        'minimist',
        'tough-cookie',
        'undici'
      ],
      output: {
        preserveModules: true,
        exports: 'named'
      }
    },
    sourcemap: true,
    minify: false,
    outDir: 'dist'
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
