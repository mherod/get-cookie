import CookieSpec from "./CookieSpec";
import { uniqBy } from "lodash";

/**
 * Generates a list of cookie specifications from a given URL.
 * Each cookie spec consists of a domain and a name, where the name is a wildcard.
 * The domain is formatted to enable querying against the cookie store for matching cookies.
 * @param url - The URL to generate cookie specs from.
 * @returns An array of unique cookie specifications.
 */
export function cookieSpecsFromUrl(url: URL | string): CookieSpec[] {
  if (!url || url === "") {
    return [];
  }

  const urlObj = typeof url === "string" ? new URL(url) : url;
  const hostnameParts = urlObj.hostname.split(".");
  const topLevelDomain = hostnameParts.slice(-2).join(".");

  const cookieSpecs: CookieSpec[] = [
    { name: "%", domain: `%.${topLevelDomain}` },
    { name: "%", domain: urlObj.hostname },
    { name: "%", domain: topLevelDomain },
  ];

  return uniqBy(cookieSpecs, JSON.stringify);
}
