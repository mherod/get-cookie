// Local imports - types
import { comboQueryCookieSpec } from "@core/cookies/comboQueryCookieSpec";
import logger from "@utils/logger";

import { CookieSpec } from "../types/schemas";

import { OutputHandlerFactory } from "./handlers/OutputHandlerFactory";
import { ParsedArgs } from "./handlers/types";

/**
 * Query cookies from browsers using the CLI interface
 * @param cookieSpec - Cookie specification(s) to query for
 * @param browsers - List of browsers to query from
 * @param profiles - List of browser profiles to query from
 * @param args - Parsed arguments
 * @param limit - Optional limit on the number of results
 * @param removeExpired - Whether to remove expired cookies from results
 * @example
 * // Query cookies from all browsers for a specific domain
 * const cookies = await cliQueryCookies(
 *   { name: '*', domain: 'example.com' },
 *   ['chrome', 'firefox'],
 *   ['default'],
 *   10,
 *   true
 * );
 *
 * // Query multiple cookie specs
 * const multiCookies = await cliQueryCookies(
 *   [
 *     { name: 'session', domain: 'app.example.com' },
 *     { name: 'auth', domain: 'auth.example.com' }
 *   ],
 *   ['chrome'],
 *   ['default', 'profile1']
 * );
 *
 * // Handle errors
 * try {
 *   const cookies = await cliQueryCookies(
 *     { name: 'token', domain: 'api.example.com' },
 *     ['chrome']
 *   );
 *   console.log(`Found ${cookies.length} cookies`);
 * } catch (error) {
 *   console.error('Failed to query cookies:', error);
 * }
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
    const results = await comboQueryCookieSpec(cookieSpec, {
      limit,
      removeExpired,
    });

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
