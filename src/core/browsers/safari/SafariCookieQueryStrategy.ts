import { join } from "path";

import { logError } from "@utils/logHelpers";

import type { BrowserName } from "../../../types/BrowserName";
import type { CookieQueryStrategy } from "../../../types/CookieQueryStrategy";
import type { ExportedCookie } from "../../../types/ExportedCookie";
import { decodeBinaryCookies } from "../decodeBinaryCookies";

/**
 * Strategy for querying cookies from Safari browser
 */
export class SafariCookieQueryStrategy implements CookieQueryStrategy {
  /**
   *
   */
  public readonly browserName: BrowserName = "Safari";

  /**
   * Gets the user's home directory from environment variables
   * @returns The home directory path or null if not set
   */
  private getHomeDir(): string | null {
    const homeDir = process.env.HOME;
    if (typeof homeDir !== "string" || homeDir.trim() === "") {
      logError(
        "SafariCookieQueryStrategy",
        "HOME environment variable is not set",
      );
      return null;
    }
    return homeDir;
  }

  /**
   * Gets the path to Safari's cookie database
   * @param homeDir - User's home directory path
   * @returns Path to Safari's cookie database
   */
  private getCookieDbPath(homeDir: string): string {
    return join(
      homeDir,
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
          (cookie) => cookie.name === name && cookie.domain.includes(domain),
        )
        .map((cookie) => ({
          domain: cookie.domain,
          name: cookie.name,
          value: cookie.value.toString(),
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
    const homeDir = this.getHomeDir();
    if (typeof homeDir !== "string" || homeDir.length === 0) {
      return Promise.resolve([]);
    }

    const cookieDbPath = this.getCookieDbPath(homeDir);
    return Promise.resolve(this.decodeCookies(cookieDbPath, name, domain));
  }
}
