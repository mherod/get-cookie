import type { CookieQueryStrategy } from "../types/CookieQueryStrategy";
import type { ExportedCookie } from "../types/ExportedCookie";

import type { MultiCookieSpec } from "./CookieSpec";

/**
 * Renders multiple cookies into a single string suitable for use in HTTP headers
 * @param cookies - Array of cookies to render
 * @returns A string containing all cookies in HTTP header format
 */
function renderCookies(cookies: ExportedCookie[]): string {
  return cookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

/**
 * Queries and merges cookies based on multiple specifications
 * @param cookieSpecs - Array of cookie specifications to query
 * @param strategy - Strategy to use for querying cookies
 * @returns A promise that resolves to a string containing all matched cookies
 */
export async function getMergedRenderedCookies(
  cookieSpecs: MultiCookieSpec,
  strategy?: CookieQueryStrategy
): Promise<string> {
  if (!cookieSpecs.length) {
    return "";
  }

  const cookies = await Promise.all(
    cookieSpecs.map(spec =>
      strategy?.queryCookies(spec.name, spec.domain) ?? Promise.resolve([])
    )
  );

  const mergedCookies = cookies.flat();
  return renderCookies(mergedCookies);
}
