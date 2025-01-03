import logger from "@utils/logger";

import { ExportedCookie } from "../../types/schemas";

import { OutputHandler, ParsedArgs } from "./types";

/**
 * Handles JSON output of cookie data
 * @example
 * ```typescript
 * const handler = new JsonOutputHandler();
 * handler.handle([
 *   {
 *     name: 'session',
 *     domain: 'example.com',
 *     value: 'abc123',
 *     meta: { file: '/path/to/cookies.db' }
 *   }
 * ]);
 * // Outputs:
 * // {
 * //   "name": "session",
 * //   "domain": "example.com",
 * //   "value": "abc123",
 * //   "meta": {
 * //     "file": "/path/to/cookies.db"
 * //   }
 * // }
 * ```
 */
export class JsonOutputHandler implements OutputHandler {
  /**
   * Checks if this handler should be used based on JSON output flag
   * @param args - The parsed command line arguments
   * @returns True if output is set to "json"
   * @example
   * ```typescript
   * const handler = new JsonOutputHandler();
   * handler.canHandle({ output: 'json' }); // true
   * handler.canHandle({ output: 'text' }); // false
   * handler.canHandle({}); // false
   * ```
   */
  public canHandle(args: ParsedArgs): boolean {
    return args.output === "json";
  }

  /**
   * Outputs the cookie data in JSON format
   * @param results - Array of exported cookies to output
   * @example
   * ```typescript
   * const handler = new JsonOutputHandler();
   * handler.handle([{
   *   name: 'session',
   *   domain: 'example.com',
   *   value: 'abc123',
   *   expiry: new Date('2024-12-31'),
   *   meta: {
   *     file: '/path/to/cookies.db',
   *     browser: 'Chrome',
   *     decrypted: true
   *   }
   * }]);
   * // Outputs formatted JSON with all cookie properties
   * ```
   */
  public handle(results: ExportedCookie[]): void {
    logger.log(JSON.stringify(results, null, 2));
  }
}
