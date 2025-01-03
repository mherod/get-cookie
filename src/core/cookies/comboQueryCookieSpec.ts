import {
  CookieQueryStrategy,
  CookieSpec,
  ExportedCookie,
  MultiCookieSpec,
} from "../../types/schemas";
import { CompositeCookieQueryStrategy } from "../browsers/CompositeCookieQueryStrategy";

/**
 * Configuration options for cookie queries
 * @property {CookieQueryStrategy} [strategy] - Strategy to use for querying cookies
 * @property {number} [limit] - Maximum number of cookies to return
 * @property {boolean} [removeExpired] - Whether to filter out expired cookies
 */
interface QueryOptions {
  strategy?: CookieQueryStrategy;
  limit?: number;
  removeExpired?: boolean;
}

/**
 * Converts cookie expiry to consistent format
 * @internal
 * @param cookie - The cookie object to convert expiry for
 * @returns The cookie object with converted expiry
 */
function convertExpiry(cookie: ExportedCookie): ExportedCookie {
  if (cookie.expiry === "Infinity") {
    return { ...cookie, expiry: "Infinity" };
  }
  if (typeof cookie.expiry === "number") {
    return { ...cookie, expiry: new Date(cookie.expiry * 1000) };
  }
  return cookie;
}

/**
 * Query cookies using multiple cookie specifications
 *
 * Allows querying cookies using either a single specification or multiple specifications
 * in parallel. Handles expiry dates and provides filtering options.
 * @param cookieSpec - The cookie specification(s) to query
 * @param options - Optional configuration for the query operation
 * @returns A promise that resolves to an array of matching cookies
 * @example
 * // Query single cookie spec
 * const cookies = await comboQueryCookieSpec({
 *   name: "session",
 *   domain: "example.com"
 * });
 * @example
 * // Query multiple specs with expired cookie removal
 * const cookies = await comboQueryCookieSpec([
 *   { name: "auth", domain: "api.example.com" },
 *   { name: "prefs", domain: "example.com" }
 * ], { removeExpired: true });
 */
export async function comboQueryCookieSpec(
  cookieSpec: MultiCookieSpec,
  options: QueryOptions = {},
): Promise<ExportedCookie[]> {
  const strategy = options.strategy ?? new CompositeCookieQueryStrategy();

  const queryFn = async (cs: CookieSpec): Promise<ExportedCookie[]> => {
    const cookies = await strategy.queryCookies(cs.name, cs.domain);
    return cookies.map(convertExpiry);
  };

  const results = Array.isArray(cookieSpec)
    ? await Promise.all(cookieSpec.map(queryFn))
    : await queryFn(cookieSpec);

  let processed = Array.isArray(results) ? results.flat() : results;

  if (options.removeExpired === true) {
    const now = Date.now();
    processed = processed.filter(
      (cookie) =>
        cookie.expiry === "Infinity" ||
        (cookie.expiry instanceof Date && cookie.expiry.getTime() > now),
    );
  }

  if (typeof options.limit === "number" && options.limit > 0) {
    processed = processed.slice(0, options.limit);
  }

  return processed;
}
