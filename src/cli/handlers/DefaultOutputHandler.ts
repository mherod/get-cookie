import logger from "@utils/logger";

import type { ExportedCookie } from "../../types/schemas";

import type { OutputHandler, ParsedArgs } from "./types";

/**
 * Default handler for cookie output when no specific format is requested
 * @example
 * ```typescript
 * const handler = new DefaultOutputHandler();
 * handler.handle([
 *   { name: 'session', domain: 'example.com', value: 'abc123' },
 *   { name: 'auth', domain: 'api.example.com', value: 'xyz789' }
 * ]);
 * // Outputs:
 * // abc123
 * // xyz789
 * ```
 */
export class DefaultOutputHandler implements OutputHandler {
  /**
   * Always returns true as this is the default handler
   * @param _args - The parsed command line arguments
   * @returns Always returns true
   * @example
   * ```typescript
   * const handler = new DefaultOutputHandler();
   * const canHandle = handler.canHandle({ format: 'default' }); // true
   * ```
   */
  public canHandle(_args: ParsedArgs): boolean {
    return true;
  }

  /**
   * Outputs unique cookie values
   * @param results - Array of exported cookies to output
   * @example
   * ```typescript
   * const handler = new DefaultOutputHandler();
   * handler.handle([
   *   { name: 'session', domain: 'example.com', value: 'abc123' },
   *   { name: 'auth', domain: 'example.com', value: 'abc123' }, // Duplicate value
   *   { name: 'token', domain: 'api.example.com', value: 'xyz789' }
   * ]);
   * // Outputs only unique values:
   * // abc123
   * // xyz789
   * ```
   */
  public handle(results: ExportedCookie[]): void {
    const uniqueValues = new Set(
      results.map((result) => result.value as string),
    );
    for (const value of uniqueValues) {
      logger.log(value);
    }
  }
}
