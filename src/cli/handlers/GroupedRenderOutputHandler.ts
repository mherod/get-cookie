import { renderCookies } from "@core/cookies/renderCookies";
import logger from "@utils/logger";

import type { ExportedCookie } from "../../types/schemas";

import type { OutputHandler, ParsedArgs } from "./types";

/**
 * Handles grouped render output of cookie data
 * @example
 * ```typescript
 * const handler = new GroupedRenderOutputHandler();
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
 * // Outputs cookies in a grouped format:
 * // /path/to/cookies1.db:
 * //   example.com:
 * //     session=abc123
 * // /path/to/cookies2.db:
 * //   api.example.com:
 * //     auth=xyz789
 * ```
 */
export class GroupedRenderOutputHandler implements OutputHandler {
  /**
   * Checks if this handler should be used based on grouped render flags
   * @param args - The parsed command line arguments
   * @returns True if grouped render flags are set
   * @example
   * ```typescript
   * const handler = new GroupedRenderOutputHandler();
   * handler.canHandle({ 'render-grouped': true }); // true
   * handler.canHandle({ R: true }); // true
   * handler.canHandle({}); // false
   * ```
   */
  public canHandle(args: ParsedArgs): boolean {
    return args["render-grouped"] === true || args.R === true;
  }

  /**
   * Outputs the cookie data in a grouped format
   * @param results - Array of exported cookies to output
   * @example
   * ```typescript
   * const handler = new GroupedRenderOutputHandler();
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
   * // Outputs:
   * // /path/to/chrome/cookies.db:
   * //   example.com:
   * //     session=abc123
   * // /path/to/firefox/cookies.sqlite:
   * //   example.com:
   * //     auth=xyz789
   * ```
   */
  public handle(results: ExportedCookie[]): void {
    logger.log(renderCookies(results, { format: "grouped" }));
  }
}
