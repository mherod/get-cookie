import type { CookieSpec, ExportedCookie } from "../types/schemas";
import { getErrorMessage } from "../utils/errorUtils";
import { logger } from "../utils/logHelpers";

import { OutputHandlerFactory } from "./handlers/OutputHandlerFactory";
import { CookieQueryService } from "./services/CookieQueryService";
import {
  type CookieQueryStrategy,
  CookieStrategyFactory,
} from "./services/CookieStrategyFactory";

interface QueryOptions {
  /** Maximum number of cookies to return */
  limit?: number;
  /** Whether to remove expired cookies */
  removeExpired: boolean;
  /** Whether to deduplicate cookies (keep newest) */
  deduplicateCookies: boolean;
  /** Optional path to a specific binarycookies store file */
  store?: string;
  /** Strategy for querying cookies */
  strategy: CookieQueryStrategy;
  /** Whether to force operations despite warnings */
  force?: boolean;
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

  // Deduplicate cookies if requested (keep newest based on creation time or longest value)
  if (options.deduplicateCookies && results.length > 0) {
    const cookieMap = new Map<string, ExportedCookie>();

    for (const cookie of results) {
      const key = `${cookie.name}:${cookie.domain}`;
      const existing = cookieMap.get(key);

      if (!existing) {
        cookieMap.set(key, cookie);
      } else {
        // Keep the cookie with the longest value (most likely to be valid)
        // or if same length, keep the one with latest creation time
        const shouldReplace =
          cookie.value.length > existing.value.length ||
          (cookie.value.length === existing.value.length &&
            cookie.creation &&
            existing.creation &&
            cookie.creation > existing.creation);

        if (shouldReplace) {
          cookieMap.set(key, cookie);
        }
      }
    }

    results = Array.from(cookieMap.values());
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
/**
 * Builds query options from command line arguments and parameters.
 * Consolidates various options into a single QueryOptions object for cookie querying.
 * @param args - Command line arguments containing optional force flag
 * @param strategy - The browser-specific cookie query strategy to use
 * @param removeExpired - Whether to filter out expired cookies from results
 * @param limit - Optional maximum number of cookies to return
 * @param store - Optional path to a specific cookie store file (e.g., Safari binarycookies)
 * @returns Configured QueryOptions object for cookie querying
 */
function buildQueryOptions(
  args: Record<string, unknown>,
  strategy: CookieQueryStrategy,
  removeExpired: boolean,
  deduplicateCookies: boolean,
  limit?: number,
  store?: string,
): QueryOptions {
  const queryOptions: QueryOptions = {
    removeExpired,
    deduplicateCookies,
    strategy,
  };
  const force = typeof args.force === "boolean" ? args.force : false;

  if (limit !== undefined) {
    queryOptions.limit = limit;
  }
  if (store !== undefined) {
    queryOptions.store = store;
  }
  if (force) {
    queryOptions.force = force;
  }

  return queryOptions;
}

/**
 * Queries browser cookies from the command line interface and outputs results.
 * This is the main entry point for CLI cookie queries, handling browser detection,
 * strategy selection, and output formatting.
 * @param args - Command line arguments including browser selection and output format
 * @param cookieSpec - Cookie specification(s) defining which cookies to retrieve
 * @param limit - Optional maximum number of cookies to return
 * @param removeExpired - Whether to exclude expired cookies from results (default: false)
 * @param store - Optional path to a specific cookie store file for direct access
 * @returns Promise that resolves when query and output are complete
 * @example
 * ```typescript
 * // Query all cookies named "session" from Chrome
 * await cliQueryCookies(
 *   { browser: "chrome", output: "json" },
 *   { name: "session", domain: "example.com" }
 * );
 * ```
 */
export async function cliQueryCookies(
  args: Record<string, unknown>,
  cookieSpec: CookieSpec | CookieSpec[],
  limit?: number,
  removeExpired = false,
  store?: string,
  deduplicateCookies = true,
): Promise<void> {
  try {
    const browser = typeof args.browser === "string" ? args.browser : undefined;
    const profile = typeof args.profile === "string" ? args.profile : undefined;
    const strategy = CookieStrategyFactory.createStrategy(
      browser,
      store,
      profile,
    );
    const queryService = new CookieQueryService(strategy);
    const specs = Array.isArray(cookieSpec) ? cookieSpec : [cookieSpec];

    const queryOptions = buildQueryOptions(
      args,
      strategy,
      removeExpired,
      deduplicateCookies,
      limit,
      store,
    );
    const results = await queryAndLimitCookies(
      queryService,
      specs,
      queryOptions,
    );

    if (results.length === 0) {
      logger.error("No results");

      // Provide helpful feedback for profile-related issues
      const profile =
        typeof args.profile === "string" ? args.profile : undefined;
      const browser =
        typeof args.browser === "string" ? args.browser : undefined;

      if (profile && browser) {
        logger.error(`Could not find cookies for profile: ${profile}`);
        logger.error(
          `Try 'get-cookie --browser ${browser} --list-profiles' to see available profiles`,
        );
      }

      return;
    }

    const outputFactory = new OutputHandlerFactory();
    const outputHandler = outputFactory.getHandler(args);
    outputHandler.handle(results);
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
}
