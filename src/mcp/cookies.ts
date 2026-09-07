import { isIP } from "node:net";

import { getDomain } from "tldts";

import { createStrategy } from "../core/browsers/StrategyFactory";
import { withRawCookieValues } from "../core/cookies/CookieQueryContext";
import type { ExportedCookie } from "../types/schemas";

import { McpOperationError } from "./policy";

/**
 * Parameters for selecting cookies from a specific browser and store.
 */
export interface CookieSelection {
  browser: string;
  profile?: string | undefined;
  container?: string | number | undefined;
  name?: string | undefined;
}

/**
 * Function signature for reading cookies given a target URL and selection criteria.
 */
export type CookieReader = (
  url: URL,
  selection: CookieSelection,
) => Promise<ExportedCookie[]>;

/**
 * Computes the domain hierarchy for cookie matching from a given hostname.
 * @param host - Target hostname to analyze.
 * @returns Array of parent and exact domain candidates.
 */
export function cookieDomains(host: string): string[] {
  const domains = [host];
  const registrable = getDomain(host, { allowPrivateDomains: true });
  if (!registrable || isIP(host)) {
    return domains;
  }
  let current = host;
  while (current !== registrable && current.includes(".")) {
    current = current.slice(current.indexOf(".") + 1);
    domains.push(current);
  }
  return domains;
}

/**
 * Default reader implementation querying local browser cookie stores.
 * @param url - Destination URL.
 * @param selection - Browser and profile selection options.
 * @returns Promise resolving to matching exported cookies.
 */
export const readCookies: CookieReader = async (url, selection) => {
  if (selection.browser === "safari" && selection.profile) {
    throw new McpOperationError("Safari does not support named profiles.");
  }
  if (selection.container !== undefined && selection.browser !== "firefox") {
    throw new McpOperationError("Containers are supported only by Firefox.");
  }
  return withRawCookieValues(async () => {
    const strategy = createStrategy({
      browser: selection.browser,
      ...(selection.profile !== undefined && { profile: selection.profile }),
      ...(selection.browser === "firefox" && {
        container: selection.container ?? "none",
      }),
    });
    const cookies: ExportedCookie[] = [];
    for (const domain of cookieDomains(url.hostname)) {
      // force=true suppresses interactive browser-close/permission prompts in
      // the existing strategies. MCP stdin belongs exclusively to the protocol.
      cookies.push(
        ...(await strategy.queryCookies(
          selection.name ?? "%",
          domain,
          undefined,
          true,
        )),
      );
    }
    return cookies;
  });
};

/**
 * Checks whether a cookie matches a destination URL according to domain, path, secure, and expiry rules.
 * @param cookie - The exported cookie to test.
 * @param url - Destination URL to match against.
 * @param now - Current timestamp in milliseconds (defaults to Date.now()).
 * @returns True if the cookie matches and is applicable for the URL.
 */
export function cookieMatchesUrl(
  cookie: ExportedCookie,
  url: URL,
  now = Date.now(),
): boolean {
  const domain = cookie.domain.toLowerCase();
  const bareDomain = domain.replace(/^\./, "");
  const hostOnly = cookie.meta?.hostOnly !== false && !domain.startsWith(".");
  if (
    hostOnly
      ? url.hostname !== bareDomain
      : !(
          url.hostname === bareDomain ||
          (!isIP(url.hostname) && url.hostname.endsWith(`.${bareDomain}`))
        )
  ) {
    return false;
  }
  // Reject cookies whose domain is a public/private suffix, even if a corrupt
  // local database contains such a row.
  if (
    domain.startsWith(".") &&
    !getDomain(bareDomain, { allowPrivateDomains: true })
  ) {
    return false;
  }
  if (cookie.meta?.secure && url.protocol !== "https:") {
    return false;
  }
  if (cookie.meta?.partitioned) {
    return false;
  }
  const path = cookie.meta?.path;
  if (!path?.startsWith("/")) {
    return false;
  }
  if (
    url.pathname !== path &&
    !(
      url.pathname.startsWith(path) &&
      (path.endsWith("/") || url.pathname[path.length] === "/")
    )
  ) {
    return false;
  }
  const expiry = cookie.expiry;
  if (expiry instanceof Date && !(expiry.getTime() > now)) {
    return false;
  }
  if (typeof expiry === "number" && !(expiry * 1000 > now)) {
    return false;
  }
  if (typeof cookie.value !== "string") {
    return false;
  }
  if (
    cookie.meta?.browser !== "Firefox" &&
    cookie.meta?.browser !== "Safari" &&
    cookie.meta?.decrypted !== true
  ) {
    return false;
  }
  return true;
}

/**
 * Queries and filters cookies applicable to a URL, deduplicating conflicting values.
 * @param url - Destination URL.
 * @param selection - Cookie selection criteria.
 * @param reader - Underlying cookie reading function.
 * @returns Filtered array of matching cookies sorted by path specificity.
 */
export async function selectCookies(
  url: URL,
  selection: CookieSelection,
  reader: CookieReader,
): Promise<ExportedCookie[]> {
  const rows = await reader(url, selection);
  const candidates = rows.filter(
    (cookie) =>
      cookieMatchesUrl(cookie, url) &&
      (selection.name === undefined || cookie.name === selection.name),
  );
  const unique = new Map<string, ExportedCookie>();
  for (const cookie of candidates) {
    const key = JSON.stringify([
      cookie.meta?.file,
      cookie.meta?.containerId,
      cookie.domain,
      cookie.name,
      cookie.meta?.path,
    ]);
    if (unique.has(key) && unique.get(key)?.value !== cookie.value) {
      throw new McpOperationError(
        "Conflicting cookies found. Select one browser profile and container.",
      );
    }
    unique.set(key, cookie);
  }
  return [...unique.values()].sort(
    (a, b) => (b.meta?.path?.length ?? 0) - (a.meta?.path?.length ?? 0),
  );
}

/**
 * Builds an HTTP Cookie header string from an array of applicable cookies.
 * @param cookies - Array of cookies to serialize.
 * @returns Formatted Cookie header value.
 */
export function cookieHeader(cookies: ExportedCookie[]): string {
  if (cookies.length === 0) {
    throw new McpOperationError(
      "No readable, applicable cookies found. Check the browser, profile, container and local permissions.",
    );
  }
  const sources = new Set(
    cookies.map((cookie) =>
      JSON.stringify([cookie.meta?.file, cookie.meta?.containerId ?? 0]),
    ),
  );
  if (sources.size !== 1) {
    throw new McpOperationError(
      "Cookies span multiple profiles or containers. Select one profile and container before fetching.",
    );
  }
  const pairs = cookies.map((cookie) => {
    if (
      !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(cookie.name) ||
      !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(cookie.value)
    ) {
      throw new McpOperationError(
        "A cookie cannot be represented safely in an HTTP Cookie header.",
      );
    }
    return `${cookie.name}=${cookie.value}`;
  });
  const header = pairs.join("; ");
  if (Buffer.byteLength(header) > 65536) {
    throw new McpOperationError("Cookie header exceeds 64 KiB.");
  }
  return header;
}
