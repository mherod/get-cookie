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
   * Formats the domain by removing leading dot if present
   * @param domain - Domain to format
   * @returns Formatted domain
   */
  private formatDomain(domain: string): string {
    return domain.startsWith(".") ? domain.slice(1) : domain;
  }

  /**
   * Formats the expiry date
   * @param expiry - Expiry timestamp
   * @returns Formatted expiry date
   */
  private formatExpiry(expiry: number): Date | "Infinity" {
    if (expiry <= 0) {
      return "Infinity";
    }
    return new Date(expiry * 1000);
  }

  /**
   * Checks if a flag bit is set
   * @param flags - The flags value
   * @param bit - The bit to check
   * @returns True if the bit is set, false otherwise
   */
  private isFlagSet(flags: number | undefined | null, bit: number): boolean {
    if (typeof flags !== "number" || isNaN(flags) || flags <= 0) {
      return false;
    }
    return (flags & bit) === bit;
  }

  /**
   * Formats the creation timestamp
   * @param creation - Creation timestamp
   * @returns Formatted creation timestamp or undefined
   */
  private formatCreation(
    creation: number | undefined | null,
  ): number | undefined {
    if (typeof creation !== "number" || isNaN(creation) || creation <= 0) {
      return undefined;
    }
    return creation * 1000;
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
            (domain === "%" ||
              this.formatDomain(cookie.domain).includes(domain)),
        )
        .map((cookie) => ({
          domain: this.formatDomain(cookie.domain),
          name: cookie.name,
          value: Buffer.isBuffer(cookie.value)
            ? cookie.value.toString()
            : String(cookie.value),
          expiry: this.formatExpiry(cookie.expiry),
          meta: {
            file: cookieDbPath,
            browser: "Safari" as const,
            decrypted: false,
            secure: this.isFlagSet(cookie.flags, 0x1),
            httpOnly: this.isFlagSet(cookie.flags, 0x4),
            path: cookie.path,
            version: cookie.version,
            comment: cookie.comment,
            commentURL: cookie.commentURL,
            port: cookie.port,
            creation: this.formatCreation(cookie.creation),
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
   * @param store - Optional store path
   * @returns Array of matching cookies, or empty array if none found
   */
  public async queryCookies(
    name: string,
    domain: string,
    store?: string,
  ): Promise<ExportedCookie[]> {
    const home = homedir();
    if (typeof home !== "string" || home.length === 0) {
      logError("SafariCookieQueryStrategy", "Failed to get home directory");
      return Promise.resolve([]);
    }

    const cookieDbPath = store ?? this.getCookieDbPath(home);
    return Promise.resolve(
      this.decodeCookies(cookieDbPath, name || "%", domain || "%"),
    );
  }
}
