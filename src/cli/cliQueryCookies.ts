import type { CookieSpec, ExportedCookie } from "../types/schemas";
import { logger } from "../utils/logHelpers";

import { OutputHandlerFactory } from "./handlers/OutputHandlerFactory";
import { filterExpired } from "./services/CookieExpiryService";
import { CookieQueryService } from "./services/CookieQueryService";
import { CookieStrategyFactory } from "./services/CookieStrategyFactory";

/**
 * Query cookies from multiple specs and apply limit
 * @param queryService - The cookie query service
 * @param specs - The cookie specifications to query for
 * @param limit - Optional limit on number of cookies to return
 * @returns Array of exported cookies
 */
async function queryCookiesWithLimit(
  queryService: CookieQueryService,
  specs: CookieSpec[],
  limit?: number,
): Promise<ExportedCookie[]> {
  let results: ExportedCookie[] = [];

  for (const spec of specs) {
    const cookies = await queryService.queryCookies(spec, limit);
    results.push(...cookies);
    if (typeof limit === "number" && limit > 0 && results.length >= limit) {
      results = results.slice(0, limit);
      break;
    }
  }

  return results;
}

/**
 * Query cookies from the browser using the specified strategy
 * @param args - The command line arguments
 * @param cookieSpec - The cookie specification to query for
 * @param limit - The maximum number of cookies to return
 * @param removeExpired - Whether to remove expired cookies
 */
export async function cliQueryCookies(
  args: Record<string, unknown>,
  cookieSpec: CookieSpec | CookieSpec[],
  limit?: number,
  removeExpired = false,
): Promise<void> {
  try {
    const browser = typeof args.browser === "string" ? args.browser : undefined;
    const strategy = CookieStrategyFactory.createStrategy(browser);
    const queryService = new CookieQueryService(strategy);

    const specs = Array.isArray(cookieSpec) ? cookieSpec : [cookieSpec];
    let results = await queryCookiesWithLimit(queryService, specs, limit);

    if (removeExpired === true) {
      results = filterExpired(results);
    }

    if (results.length === 0) {
      logger.error("No results");
      return;
    }

    const outputHandlerFactory = new OutputHandlerFactory();
    const handler = outputHandlerFactory.getHandler(args);
    void handler.handle(results);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An unknown error occurred");
    }
  }
}
