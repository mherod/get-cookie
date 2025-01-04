import minimist from "minimist";

/**
 * Interface representing parsed command line arguments.
 * @property values - Record of option values parsed from command line
 * @property positionals - Array of positional arguments
 * @example
 * ```typescript
 * const args: ParsedArgs = {
 *   values: {
 *     browser: 'chrome',
 *     profile: 'default',
 *     verbose: true
 *   },
 *   positionals: ['script.js', 'input.txt']
 * }
 * ```
 */
interface ParsedArgs {
  /** Record of option values parsed from command line */
  values: Record<string, string | boolean | string[]>;
  /** Array of positional arguments */
  positionals: string[];
}

/**
 * Parses command line arguments into a structured format.
 * @internal
 * @param argv - Array of command line arguments to parse
 * @returns Parsed command line arguments object
 * @example
 * ```typescript
 * // Basic usage
 * const args = parseArgv(['--browser', 'chrome', '--verbose', 'script.js']);
 * // Returns: { values: { browser: 'chrome', verbose: true }, positionals: ['script.js'] }
 *
 * // Using short options
 * const args = parseArgv(['-b', 'firefox', '-v', 'script.js']);
 * // Returns: { values: { browser: 'firefox', verbose: true }, positionals: ['script.js'] }
 *
 * // Error handling
 * const args = parseArgv(['--invalid']); // Will throw error for unknown option
 * ```
 */
export function parseArgv(argv: string[]): ParsedArgs {
  const parsed = minimist(argv, {
    string: ["browser", "profile", "url", "domain", "name", "output", "store"],
    boolean: [
      "help",
      "version",
      "verbose",
      "dump",
      "dump-grouped",
      "render",
      "render-grouped",
    ],
    alias: {
      b: "browser",
      p: "profile",
      u: "url",
      d: "domain",
      n: "name",
      h: "help",
      v: "version",
      D: "dump-grouped",
      r: "render",
      R: "render-grouped",
    },
  });

  const { _, ...values } = parsed;
  return { values, positionals: _ };
}
