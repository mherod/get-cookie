import { renderCookies } from "@core/cookies/renderCookies";
import logger from "@utils/logger";

import type { ExportedCookie } from "../../types/schemas";

import type { OutputHandler, ParsedArgs } from "./types";

/**
 * Handles merged render output of cookie data
 * @example
 * ```typescript
 * const handler = new RenderOutputHandler();
 * handler.handle([
 *   {
 *     name: 'session',
 *     domain: 'example.com',
 *     value: 'abc123',
 *     meta: { file: '/path/to/cookies.db' }
 *   },
 *   {
 *     name: 'auth',
 *     domain: 'api.example.com',
 *     value: 'xyz789',
 *     meta: { file: '/path/to/cookies.db' }
 *   }
 * ]);
 * // Outputs cookies in a merged format:
 * // example.com:
 * //   session=abc123
 * // api.example.com:
 * //   auth=xyz789
 * ```
 */
export class RenderOutputHandler implements OutputHandler {
  /**
   * Checks if this handler should be used based on render flags
   * @param args - The parsed command line arguments
   * @returns True if any render flag is set
   * @example
   * ```typescript
   * const handler = new RenderOutputHandler();
   * handler.canHandle({ render: true }); // true
   * handler.canHandle({ 'render-merged': true }); // true
   * handler.canHandle({ r: true }); // true
   * handler.canHandle({}); // false
   * ```
   */
  public canHandle(args: ParsedArgs): boolean {
    return (
      args.render === true || args["render-merged"] === true || args.r === true
    );
  }

  /**
   * Outputs the cookie data in a merged format
   * @param results - Array of exported cookies to output
   * @example
   * ```typescript
   * const handler = new RenderOutputHandler();
   * handler.handle([
   *   {
   *     name: 'session',
   *     domain: 'example.com',
   *     value: 'abc123',
   *     meta: {
   *       file: '/path/to/cookies.db',
   *       browser: 'Chrome'
   *     }
   *   }
   * ]);
   * // Outputs:
   * // example.com:
   * //   session=abc123
   * ```
   */
  public handle(results: ExportedCookie[]): void {
    if (results.length === 0) {
      return;
    }

    logger.log(renderCookies(results, { format: "merged" }));
  }
}
