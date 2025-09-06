import { memoize } from "lodash-es";

import type {
  CookieQueryStrategy,
  CookieSpec,
  ExportedCookie,
} from "../types/schemas";

/**
 * Renders an array of cookies into a single string
 * @param cookies - Array of cookies to render
 * @returns Rendered cookie string
 */
const renderCookies = memoize(
  (cookies: ExportedCookie[]): string => {
    return cookies
      .map((cookie: ExportedCookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
  },
  (cookies: ExportedCookie[]) => JSON.stringify(cookies),
);

/**
 * Gets and renders cookies from multiple cookie specs
 * @param cookieSpecs - Array of cookie specs to query
 * @param strategy - Optional strategy to use for querying cookies
 * @returns Promise resolving to rendered cookie string
 */
export async function getMergedRenderedCookies(
  cookieSpecs: CookieSpec[],
  strategy?: CookieQueryStrategy,
): Promise<string> {
  if (!Array.isArray(cookieSpecs)) {
    return "";
  }

  const cookiePromises = cookieSpecs.map(
    async (spec) =>
      strategy?.queryCookies(spec.name, spec.domain, undefined, false) ??
      Promise.resolve([]),
  );

  const cookies = await Promise.all(cookiePromises);
  const mergedCookies = cookies.flat();
  return renderCookies(mergedCookies);
}
