import { parseArgs } from "node:util";

/**
 * Interface representing parsed command line arguments
 *
 * @property values - Record of option values parsed from command line
 * @property positionals - Array of positional arguments
 *
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
 * Parses command line arguments into a structured format
 *
 * @internal
 *
 * @param argv - Array of command line arguments to parse
 * @returns Parsed command line arguments object
 *
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
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      browser: {
        type: "string",
        short: "b",
      },
      profile: {
        type: "string",
        short: "p",
      },
      url: {
        type: "string",
        short: "u",
      },
      domain: {
        type: "string",
        short: "d",
      },
      name: {
        type: "string",
        short: "n",
      },
      help: {
        type: "boolean",
        short: "h",
      },
      version: {
        type: "boolean",
        short: "v",
      },
      verbose: {
        type: "boolean",
      },
    },
    allowPositionals: true,
  });

  return { values, positionals };
}
