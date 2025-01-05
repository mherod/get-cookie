import { formatCookieVerbose } from "../core/formatting/cookieFormatter";
import type { CookieSpec, ExportedCookie } from "../types/schemas";
import { logger } from "../utils/logHelpers";

import { CookieQueryService } from "./services/CookieQueryService";
import {
  CookieStrategyFactory,
  type CookieQueryStrategy,
} from "./services/CookieStrategyFactory";

interface QueryOptions {
  /** Maximum number of cookies to return */
  limit?: number;
  /** Whether to remove expired cookies */
  removeExpired: boolean;
  /** Optional path to a specific binarycookies store file */
  store?: string;
  /** Strategy for querying cookies */
  strategy: CookieQueryStrategy;
}

/**
 * Internal function to query cookies and apply limit
 * @param queryService - The query service to use
 * @param specs - Cookie specifications to query
 * @param options - Query options including limit, expiry handling, store path, and strategy
 * @returns Array of cookies
 */
async function queryAndLimitCookies(
  queryService: CookieQueryService,
  specs: CookieSpec[],
  options: QueryOptions,
): Promise<ExportedCookie[]> {
  let results: ExportedCookie[] = [];

  for (const spec of specs) {
    const cookies = await queryService.queryCookies(spec, options);
    results = [...results, ...cookies];

    if (
      typeof options.limit === "number" &&
      options.limit > 0 &&
      results.length >= options.limit
    ) {
      results = results.slice(0, options.limit);
      break;
    }
  }

  return results;
}

/**
 * Query cookies from the browser using the specified strategy
 * @param args - Command line arguments including browser and output format options
 * @param cookieSpec - Cookie specification(s) to query for
 * @param limit - Maximum number of cookies to return
 * @param removeExpired - Whether to remove expired cookies
 * @param store - Optional path to a specific binarycookies store file
 */
export async function cliQueryCookies(
  args: Record<string, unknown>,
  cookieSpec: CookieSpec | CookieSpec[],
  limit?: number,
  removeExpired = false,
  store?: string,
): Promise<void> {
  try {
    const browser = typeof args.browser === "string" ? args.browser : undefined;
    const strategy = CookieStrategyFactory.createStrategy(browser);
    const queryService = new CookieQueryService(strategy);
    const specs = Array.isArray(cookieSpec) ? cookieSpec : [cookieSpec];

    const results = await queryAndLimitCookies(queryService, specs, {
      limit,
      removeExpired,
      store,
      strategy,
    });

    if (results.length === 0) {
      logger.error("No results");
      return;
    }

    if (args["--json"] === true) {
      logger.log(JSON.stringify(results, null, 2));
    } else {
      results.forEach((cookie: ExportedCookie) => {
        const lines = formatCookieVerbose(cookie);
        lines.forEach((line) => logger.log(line));
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An unknown error occurred");
    }
  }
}

/**
 * Query cookies based on the provided specification
 * @param spec - The cookie specification to query
 * @param service - The cookie query service to use
 * @param verbose - Whether to output verbose information
 * @returns Promise that resolves when the query is complete
 */
export async function queryCookies(
  spec: CookieSpec,
  service: CookieQueryService,
  verbose = false,
): Promise<void> {
  const results = await service.queryCookies(spec);
  if (results.length === 0) {
    logger.warn("No cookies found matching the specified criteria");
    return;
  }

  if (verbose) {
    results.forEach((cookie) => {
      const lines = formatCookieVerbose(cookie);
      lines.forEach((line) => logger.log(line));
    });
  } else {
    logger.log(JSON.stringify(results, null, 2));
  }
}
