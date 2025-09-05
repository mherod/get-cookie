import { defineConfig } from "tsup";

/**
 * Configuration for building the CLI bundle
 * @example
 * ```typescript
 * // Build the CLI bundle
 * import config from './tsup.cli';
 * await build(config);
 * ```
 */
export default defineConfig({
  entry: ["src/cli/cli.ts"],
  format: ["cjs"],
  dts: true,
  clean: false,
  sourcemap: true,
  minify: true,
  platform: "node",
  bundle: true,
  tsconfig: "./tsconfig.cli.json",
  noExternal: ["lodash-es"],
  esbuildOptions(options) {
    options.alias = {
      lodash: "lodash-es",
    };
  },
});
