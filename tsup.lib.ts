import { defineConfig } from "tsup";

/**
 * Configuration for building the library bundle
 * @example
 * ```typescript
 * // Build the library bundle
 * import config from './tsup.lib';
 * await build(config);
 * ```
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
    entry: ["src/index.ts"],
    compilerOptions: {
      strict: true,
      noEmitOnError: true,
    },
  },
  clean: true,
  sourcemap: true,
  minify: true,
  platform: "node",
  bundle: true,
  tsconfig: "./tsconfig.tsup.json",
  external: ["fs", "path", "crypto", "os", "child_process", "lodash-es"],
  treeshake: true,
  splitting: false,
  skipNodeModulesBundle: true,
  esbuildOptions(options) {
    options.alias = {
      lodash: "lodash-es",
    };
  },
});
