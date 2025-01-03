import { parseArgs } from 'node:util'

/**
 * Interface representing parsed command line arguments
 */
interface ParsedArgs {
  /** Record of option values parsed from command line */
  values: Record<string, string | boolean | string[]>
  /** Array of positional arguments */
  positionals: string[]
}

/**
 * Parses command line arguments into a structured format
 * @param argv - Array of command line arguments to parse
 * @returns Parsed command line arguments object
 */
export function parseArgv(argv: string[]): ParsedArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      'browser': {
        type: 'string',
        short: 'b',
      },
      'profile': {
        type: 'string',
        short: 'p',
      },
      'url': {
        type: 'string',
        short: 'u',
      },
      'domain': {
        type: 'string',
        short: 'd',
      },
      'name': {
        type: 'string',
        short: 'n',
      },
      'help': {
        type: 'boolean',
        short: 'h',
      },
      'version': {
        type: 'boolean',
        short: 'v',
      },
      'verbose': {
        type: 'boolean',
      },
    },
    allowPositionals: true,
  })

  return { values, positionals }
}
