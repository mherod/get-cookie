import type { BinaryCookieRow } from "../../../types/schemas";

import { BinaryCodableCookies } from "./BinaryCodableCookies";

/**
 * Decodes a Safari binary cookie file into an array of cookie objects.
 * @param cookieDbPath - Path to the Safari Cookies.binarycookies file
 * @returns Array of decoded cookie objects
 * @throws {Error} If the file cannot be read or has invalid format
 */
export function decodeBinaryCookies(cookieDbPath: string): BinaryCookieRow[] {
  const cookies = BinaryCodableCookies.fromFile(cookieDbPath);
  return cookies.toCookieRows();
}

/**
 * Retrieves cookies from Safari's binary cookie store.
 * @returns Array of decoded Safari cookies
 */
export function getSafariCookies(): BinaryCookieRow[] {
  const cookies = BinaryCodableCookies.fromDefaultPath();
  return cookies.toCookieRows();
}
