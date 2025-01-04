import { homedir } from "os";
import { join } from "path";

import { logError } from "@utils/logHelpers";

import type {
  BrowserName,
  CookieQueryStrategy,
  ExportedCookie,
} from "../../../types/schemas";

import { decodeBinaryCookies } from "./decodeBinaryCookies";

/**
 * Strategy for querying cookies from Safari browser
 */
export class SafariCookieQueryStrategy implements CookieQueryStrategy {
  /**
   * The browser name for this strategy
   */
  public readonly browserName: BrowserName = "Safari";

  /**
   * Gets the path to Safari's cookie database
   * @param home - The user's home directory
   * @returns Path to the cookie database
   */
  private getCookieDbPath(home: string): string {
    return join(
      home,
      "Library",
      "Containers",
      "com.apple.Safari",
      "Data",
      "Library",
      "Cookies",
      "Cookies.binarycookies",
    );
  }

  /**
   * Decodes cookies from Safari's binary cookie file
   * @param cookieDbPath - Path to the cookie database
   * @param name - Name of the cookie to find
   * @param domain - Domain to filter cookies by
   * @returns Array of exported cookies
   */
  private decodeCookies(
    cookieDbPath: string,
    name: string,
    domain: string,
  ): ExportedCookie[] {
    try {
      const cookies = decodeBinaryCookies(cookieDbPath);
      return cookies
        .filter(
          (cookie) =>
            (name === "%" || cookie.name === name) &&
            (domain === "%" || cookie.domain.includes(domain)),
        )
        .map((cookie) => ({
          domain: cookie.domain,
          name: cookie.name,
          value: Buffer.isBuffer(cookie.value)
            ? cookie.value.toString()
            : String(cookie.value),
          expiry:
            typeof cookie.expiry === "number" && cookie.expiry > 0
              ? new Date(cookie.expiry * 1000)
              : "Infinity",
          meta: {
            file: cookieDbPath,
            browser: "Safari" as const,
            decrypted: false,
          },
        }));
    } catch (error) {
      if (error instanceof Error) {
        logError(
          "SafariCookieQueryStrategy",
          `Error decoding ${cookieDbPath}`,
          { error, name, domain },
        );
      } else {
        logError(
          "SafariCookieQueryStrategy",
          `Error decoding ${cookieDbPath}`,
          { error: "Unknown error", name, domain },
        );
      }
      return [];
    }
  }

  /**
   * Query Safari's cookie storage for cookies matching the given criteria
   * @param name - Name of the cookie to find
   * @param domain - Domain to filter cookies by
   * @returns Array of matching cookies, or empty array if none found
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    const home = homedir();
    if (typeof home !== "string" || home.length === 0) {
      logError("SafariCookieQueryStrategy", "Failed to get home directory");
      return Promise.resolve([]);
    }

    const cookieDbPath = this.getCookieDbPath(home);
    return Promise.resolve(this.decodeCookies(cookieDbPath, name || "%", domain || "%"));
  }
}
