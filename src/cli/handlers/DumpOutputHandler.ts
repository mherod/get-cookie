import logger from "@utils/logger";

import type { ExportedCookie } from "../../types/schemas";

import type { OutputHandler, ParsedArgs } from "./types";

/**
 * Handles raw dump output of cookie data
 * @example
 * ```typescript
 * const handler = new DumpOutputHandler();
 * handler.handle([
 *   { name: 'session', domain: 'example.com', value: 'abc123' },
 *   { name: 'auth', domain: 'api.example.com', value: 'xyz789' }
 * ]);
 * // Outputs the full cookie objects:
 * // [
 * //   { name: 'session', domain: 'example.com', value: 'abc123' },
 * //   { name: 'auth', domain: 'api.example.com', value: 'xyz789' }
 * // ]
 * ```
 */
export class DumpOutputHandler implements OutputHandler {
  /**
   * Checks if this handler should be used based on dump flags
   * @param args - The parsed command line arguments
   * @returns True if dump flags are set
   * @example
   * ```typescript
   * const handler = new DumpOutputHandler();
   * handler.canHandle({ dump: true }); // true
   * handler.canHandle({ d: true }); // true
   * handler.canHandle({}); // false
   * ```
   */
  public canHandle(args: ParsedArgs): boolean {
    return args.dump === true || args.d === true;
  }

  /**
   * Outputs the raw cookie data
   * @param results - Array of exported cookies to output
   * @example
   * ```typescript
   * const handler = new DumpOutputHandler();
   * handler.handle([{
   *   name: 'session',
   *   domain: 'example.com',
   *   value: 'abc123',
   *   meta: {
   *     file: '/path/to/cookies.db',
   *     browser: 'Chrome'
   *   }
   * }]);
   * // Outputs the full cookie object with all properties
   * ```
   */
  public handle(results: ExportedCookie[]): void {
    logger.log(results);
  }
}
