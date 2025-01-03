import { join } from "path";

import logger from "@utils/logger";

import type { BrowserName } from "../../../types/BrowserName";
import type { CookieQueryStrategy } from "../../../types/CookieQueryStrategy";
import type { ExportedCookie } from "../../../types/ExportedCookie";
import { decodeBinaryCookies } from "../decodeBinaryCookies";

const consola = logger.withTag("SafariCookieQueryStrategy");

/**
 * Implementation of CookieQueryStrategy for Safari browser
 * Handles querying cookies from Safari's binary cookies storage format
 */
export class SafariCookieQueryStrategy implements CookieQueryStrategy {
  /** The name of the browser this strategy is implemented for */
  public readonly browserName: BrowserName = "Safari";

  /**
   * Query Safari's cookie storage for cookies matching the given criteria
   * @param name - The name of the cookie to query
   * @param domain - The domain to query cookies from
   * @returns A promise that resolves to matching cookies from Safari's storage
   * @throws {Error} If HOME environment variable is not set or cookie file cannot be accessed
   */
  public async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const homeDir = process.env.HOME;
    if (typeof homeDir !== 'string' || homeDir === '') {
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
        (cookie) => cookie.name === name && cookie.domain.includes(domain)
      );

      const exportedCookies = filteredCookies.map((cookie) => {
        const expiry = typeof cookie.expiry === 'number' && cookie.expiry > 0
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
            decrypted: false
          }
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
