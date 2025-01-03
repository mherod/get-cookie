import type { CookieQueryStrategy } from "../../types/CookieQueryStrategy";
import type { CookieSpec, MultiCookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";
import { CompositeCookieQueryStrategy } from "../browsers/CompositeCookieQueryStrategy";

interface QueryOptions {
  strategy?: CookieQueryStrategy;
  limit?: number;
  removeExpired?: boolean;
}

function convertExpiry(cookie: ExportedCookie): ExportedCookie {
  if (cookie.expiry === "Infinity" || cookie.expiry === Infinity) {
    return { ...cookie, expiry: "Infinity" };
  }
  if (typeof cookie.expiry === 'number') {
    return { ...cookie, expiry: new Date(cookie.expiry * 1000) };
  }
  return cookie;
}

/**
 * Query cookies using multiple cookie specifications
 * @param cookieSpec - The cookie specification(s) to query
 * @param options - Optional configuration for the query operation
 * @returns A promise that resolves to an array of matching cookies
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
    processed = processed.filter(cookie =>
      cookie.expiry === "Infinity" ||
      (cookie.expiry instanceof Date && cookie.expiry.getTime() > now)
    );
  }

  if (typeof options.limit === 'number' && options.limit > 0) {
    processed = processed.slice(0, options.limit);
  }

  return processed;
}
