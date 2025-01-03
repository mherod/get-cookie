import logger from "@utils/logger";

import type { CookieSpec } from "../types/schemas";

import { OutputHandlerFactory } from "./handlers/OutputHandlerFactory";
import type { ParsedArgs } from "./handlers/types";
import { filterExpired } from "./services/CookieExpiryService";
import { CookieQueryService } from "./services/CookieQueryService";
import { CookieStrategyFactory } from "./services/CookieStrategyFactory";

/**
 * Query cookies from specified browsers and output them in the requested format
 * @param cookieSpec - Cookie specification(s) to search for
 * @param browsers - List of browsers to search in
 * @param profiles - List of browser profiles to search in
 * @param args - Command line arguments
 * @param limit - Maximum number of cookies to return
 * @param removeExpired - Whether to remove expired cookies
 * @returns Promise that resolves when the operation is complete
 * @example
 * // Query cookies from all browsers for a specific domain
 * await cliQueryCookies(
 *   { name: '*', domain: 'example.com' },
 *   ['chrome', 'firefox'],
 *   ['default'],
 *   { format: 'json' },
 *   10,
 *   true
 * );
 */
export async function cliQueryCookies(
  cookieSpec: CookieSpec | CookieSpec[],
  browsers: string[],
  profiles: string[],
  args: ParsedArgs,
  limit?: number,
  removeExpired?: boolean,
): Promise<void> {
  try {
    const strategy = CookieStrategyFactory.createStrategy(browsers);
    const queryService = new CookieQueryService(strategy);
    const specs = Array.isArray(cookieSpec) ? cookieSpec : [cookieSpec];

    let results = await queryService.queryCookiesWithLimit(specs, limit);

    if (removeExpired === true) {
      results = filterExpired(results);
    }

    if (results.length === 0) {
      logger.error("No results");
      return;
    }

    const outputHandlerFactory = new OutputHandlerFactory();
    const handler = outputHandlerFactory.getHandler(args);
    handler.handle(results);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An unknown error occurred");
    }
  }
}
