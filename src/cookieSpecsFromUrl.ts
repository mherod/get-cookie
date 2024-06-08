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

  const urlObj: URL = parseUrl(url);
  const hostnameParts: string[] = splitHostname(urlObj.hostname);
  const topLevelDomain: string = getTopLevelDomain(hostnameParts);

  const cookieSpecs: CookieSpec[] = createCookieSpecs(urlObj.hostname, topLevelDomain);

  return uniqBy(cookieSpecs, (spec: CookieSpec) => `${spec.name}:${spec.domain}`);
}

/**
 * Parses the input URL string or URL object and returns a URL object.
 * @param url - The URL to parse.
 * @returns A URL object.
 */
function parseUrl(url: URL | string): URL {
  return typeof url === "string" ? new URL(url) : url;
}

/**
 * Splits the hostname into its constituent parts.
 * @param hostname - The hostname to split.
 * @returns An array of strings representing the parts of the hostname.
 */
function splitHostname(hostname: string): string[] {
  return hostname.split(".");
}

/**
 * Extracts the top-level domain from the hostname parts.
 * @param hostnameParts - The parts of the hostname.
 * @returns A string representing the top-level domain.
 */
function getTopLevelDomain(hostnameParts: string[]): string {
  return hostnameParts.slice(-2).join(".");
}

/**
 * Creates cookie specifications based on the hostname and top-level domain.
 * @param hostname - The full hostname.
 * @param topLevelDomain - The top-level domain.
 * @returns An array of CookieSpec objects.
 */
function createCookieSpecs(hostname: string, topLevelDomain: string): CookieSpec[] {
  return [
    { name: "%", domain: `%.${topLevelDomain}` },
    { name: "%", domain: hostname },
    { name: "%", domain: topLevelDomain },
  ];
}
