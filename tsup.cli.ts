import { execSync } from "node:child_process";

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
  dts: {
    resolve: true,
    entry: ["src/cli/cli.ts"],
    compilerOptions: {
      strict: true,
      noEmitOnError: true,
    },
  },
  clean: false,
  sourcemap: true,
  minify: true,
  platform: "node",
  bundle: true,
  tsconfig: "./tsconfig.cli.json",
  noExternal: ["lodash-es"],
  treeshake: true,
  splitting: false,
  skipNodeModulesBundle: true,
  esbuildOptions(options) {
    options.alias = {
      lodash: "lodash-es",
    };
    // Inject build timestamp at compile time
    const now = new Date();
    const timestamp = now.toISOString().replace("T", " ").slice(0, 19);

    // Try to get git branch name
    let gitBranch = "local";
    try {
      gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();
    } catch {
      // Ignore git errors
    }

    options.define = {
      ...options.define,
      BUILD_TIMESTAMP: JSON.stringify(`${timestamp} UTC (${gitBranch})`),
    };
  },
});
