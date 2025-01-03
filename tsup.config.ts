import { defineConfig } from "tsup";

/**
 * Main configuration for building both library and CLI bundles
 * @example
 * ```typescript
 * // Build both library and CLI bundles
 * import config from './tsup.config';
 * await build(config);
 * ```
 */
export default defineConfig({
  entry: ["src/index.ts", "src/cli/cli.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true,
  platform: "node",
  bundle: true,
  external: ["fs", "path", "crypto", "os", "child_process"],
  esbuildOptions(options) {
    options.alias = {
      lodash: "lodash-es",
    };
  },
});
