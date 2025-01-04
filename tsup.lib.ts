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
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true,
  platform: "node",
  bundle: true,
  tsconfig: "./tsconfig.tsup.json",
  external: ["fs", "path", "crypto", "os", "child_process"],
  esbuildOptions(options) {
    options.alias = {
      lodash: "lodash-es",
    };
  },
});
