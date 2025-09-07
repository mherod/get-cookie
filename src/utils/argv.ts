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
 * Configuration for command line options
 */
const CLI_OPTIONS = {
  string: [
    "browser",
    "profile",
    "url",
    "domain",
    "name",
    "output",
    "store",
    "jwt-secret",
  ] as string[],
  boolean: [
    "help",
    "version",
    "verbose",
    "dump",
    "dump-grouped",
    "render",
    "render-grouped",
    "force",
    "include-expired",
    "include-all",
    "list-profiles",
    "detect-jwt",
    "jwt-only",
  ] as string[],
  alias: {
    b: "browser",
    p: "profile",
    u: "url",
    d: "dump",
    D: "domain",
    n: "name",
    h: "help",
    v: "verbose",
    f: "force",
    G: "dump-grouped",
    r: "render",
    R: "render-grouped",
    j: "detect-jwt",
  },
};

/**
 * Generate all known flags from the CLI_OPTIONS configuration
 * @returns Array of all valid CLI flags (both long and short forms)
 */
function generateKnownFlags(): string[] {
  const flags: string[] = [];

  // Add string options
  for (const opt of CLI_OPTIONS.string) {
    flags.push(`--${opt}`);
  }

  // Add boolean options
  for (const opt of CLI_OPTIONS.boolean) {
    flags.push(`--${opt}`);
  }

  // Add aliases
  for (const [short, long] of Object.entries(CLI_OPTIONS.alias)) {
    flags.push(`-${short}`);
    // Also ensure the long form is included (in case not in string/boolean arrays)
    if (!flags.includes(`--${long}`)) {
      flags.push(`--${long}`);
    }
  }

  return flags;
}

/**
 * Cached known flags array
 */
const KNOWN_FLAGS = generateKnownFlags();

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
    ...CLI_OPTIONS,
    unknown: (arg: string) => {
      // Allow positional arguments (don't start with -)
      if (!arg.startsWith("-")) {
        return true;
      }
      // Check if it's a known flag or alias
      const isKnown = KNOWN_FLAGS.some((flag) => arg.startsWith(flag));
      if (!isKnown) {
        throw new Error(`Unknown option: ${arg}`);
      }
      return true;
    },
  });

  const { _, ...values } = parsed;
  return { values, positionals: _ };
}
