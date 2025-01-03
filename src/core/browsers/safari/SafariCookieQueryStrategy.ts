import { join } from "path";

import logger from "@utils/logger";

import type { BrowserName } from "../../../types/BrowserName";
import type { CookieQueryStrategy } from "../../../types/CookieQueryStrategy";
import type { ExportedCookie } from "../../../types/ExportedCookie";
import { decodeBinaryCookies } from "../decodeBinaryCookies";

const consola = logger.withTag("SafariCookieQueryStrategy");

/**
 * Implementation of CookieQueryStrategy for Safari browser.
 * Handles querying cookies from Safari's binary cookies storage format.
 *
 * @example
 * const strategy = new SafariCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('sessionId', 'example.com');
 *
 * @implements {CookieQueryStrategy}
 */
export class SafariCookieQueryStrategy implements CookieQueryStrategy {
  /**
   * The name of the browser this strategy is implemented for.
   * Always returns "Safari" as this is a Safari-specific implementation.
   *
   * @readonly
   */
  public readonly browserName: BrowserName = "Safari";

  /**
   * Query Safari's cookie storage for cookies matching the given criteria.
   * Searches through Safari's binary cookie storage file located in the user's Library folder.
   *
   * @example
   * // Query a session cookie
   * const cookies = await strategy.queryCookies('sessionId', 'example.com');
   *
   * @example
   * // Handle missing cookie case
   * try {
   *   const cookies = await strategy.queryCookies('missing', 'example.com');
   *   // cookies will be an empty array if none found
   * } catch (error) {
   *   // Handle file access errors
   * }
   *
   * @param name - The name of the cookie to query
   * @param domain - The domain to query cookies from
   *
   * @returns A promise that resolves to matching cookies from Safari's storage.
   * Returns an empty array if no cookies match or if HOME environment variable is not set.
   *
   * @throws {Error} If cookie file cannot be accessed or is corrupted
   * @internal
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    const homeDir = process.env.HOME;
    if (typeof homeDir !== "string" || homeDir === "") {
      consola.error("HOME environment variable is not set");
      return [];
    }

    const cookieDbPath = join(
      homeDir,
      "Library",
      "Cookies",
      "Cookies.binarycookies",
    );

    try {
      const cookies = await decodeBinaryCookies(cookieDbPath);

      const filteredCookies = cookies.filter(
        (cookie) => cookie.name === name && cookie.domain.includes(domain),
      );

      const exportedCookies = filteredCookies.map((cookie) => {
        const expiry =
          typeof cookie.expiry === "number" && cookie.expiry > 0
            ? new Date(cookie.expiry * 1000)
            : "Infinity";

        return {
          domain: cookie.domain,
          name: cookie.name,
          value: cookie.value.toString("utf8"),
          expiry,
          meta: {
            file: cookieDbPath,
            browser: "Safari",
            decrypted: false,
          },
        } satisfies ExportedCookie;
      });

      return exportedCookies;
    } catch (error) {
      if (error instanceof Error) {
        consola.error(`Error decoding ${cookieDbPath}:`, error.message);
      } else {
        consola.error(`Error decoding ${cookieDbPath}: Unknown error`);
      }
      return [];
    }
  }
}
