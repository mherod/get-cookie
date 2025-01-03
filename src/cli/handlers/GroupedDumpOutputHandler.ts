import { groupBy } from "lodash-es";

import logger from "@utils/logger";

import { ExportedCookie } from "../../types/schemas";

import { OutputHandler, ParsedArgs } from "./types";

/**
 * Handles grouped dump output of cookie data
 * @example
 * ```typescript
 * const handler = new GroupedDumpOutputHandler();
 * handler.handle([
 *   {
 *     name: 'session',
 *     domain: 'example.com',
 *     value: 'abc123',
 *     meta: { file: '/path/to/cookies1.db' }
 *   },
 *   {
 *     name: 'auth',
 *     domain: 'api.example.com',
 *     value: 'xyz789',
 *     meta: { file: '/path/to/cookies2.db' }
 *   }
 * ]);
 * // Outputs cookies grouped by file:
 * // {
 * //   "/path/to/cookies1.db": [
 * //     { name: "session", domain: "example.com", value: "abc123", ... }
 * //   ],
 * //   "/path/to/cookies2.db": [
 * //     { name: "auth", domain: "api.example.com", value: "xyz789", ... }
 * //   ]
 * // }
 * ```
 */
export class GroupedDumpOutputHandler implements OutputHandler {
  /**
   * Checks if this handler should be used based on grouped dump flags
   * @param args - The parsed command line arguments
   * @returns True if grouped dump flags are set
   * @example
   * ```typescript
   * const handler = new GroupedDumpOutputHandler();
   * handler.canHandle({ 'dump-grouped': true }); // true
   * handler.canHandle({ D: true }); // true
   * handler.canHandle({}); // false
   * ```
   */
  public canHandle(args: ParsedArgs): boolean {
    return args["dump-grouped"] === true || args.D === true;
  }

  /**
   * Outputs the cookie data grouped by source file
   * @param results - Array of exported cookies to output
   * @example
   * ```typescript
   * const handler = new GroupedDumpOutputHandler();
   * handler.handle([
   *   {
   *     name: 'session',
   *     domain: 'example.com',
   *     value: 'abc123',
   *     meta: { file: '/path/to/chrome/cookies.db' }
   *   },
   *   {
   *     name: 'auth',
   *     domain: 'example.com',
   *     value: 'xyz789',
   *     meta: { file: '/path/to/firefox/cookies.sqlite' }
   *   }
   * ]);
   * // Groups and outputs cookies by their source file
   * ```
   */
  public handle(results: ExportedCookie[]): void {
    const groupedByFile = groupBy(results, (r) => r.meta?.file ?? "unknown");
    logger.log(JSON.stringify(groupedByFile, null, 2));
  }
}
