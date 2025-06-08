import { homedir } from "os";
import { join } from "path";

import type { ExportedCookie } from "../../../types/schemas";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";

import { decodeBinaryCookies } from "./decodeBinaryCookies";

/**
 * Strategy for querying cookies from Safari browser.
 * This class extends the BaseCookieQueryStrategy and implements Safari-specific
 * cookie extraction logic.
 */
export class SafariCookieQueryStrategy extends BaseCookieQueryStrategy {
  /**
   * Creates a new instance of SafariCookieQueryStrategy
   */
  public constructor() {
    super("SafariCookieQueryStrategy", "Safari");
  }

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
   * @param expiry - Expiry timestamp (Unix epoch seconds)
   * @returns Formatted expiry date or "Infinity"
   */
  private formatExpiry(expiry: number): Date | "Infinity" {
    if (expiry <= 0) {
      return "Infinity";
    }

    // Validate timestamp is reasonable (1970-2100 range in seconds)
    const minTimestamp = 0; // 1970-01-01
    const maxTimestamp = 4102444800; // 2100-01-01

    if (expiry < minTimestamp || expiry > maxTimestamp) {
      this.logger.warn("Invalid expiry timestamp, treating as session cookie", {
        expiry,
      });
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
   * @param creation - Creation timestamp (Unix epoch seconds)
   * @returns Formatted creation timestamp in milliseconds or undefined
   */
  private formatCreation(
    creation: number | undefined | null,
  ): number | undefined {
    if (typeof creation !== "number" || isNaN(creation) || creation <= 0) {
      return undefined;
    }

    // Validate timestamp is reasonable (1970-2100 range in seconds)
    const minTimestamp = 0; // 1970-01-01
    const maxTimestamp = 4102444800; // 2100-01-01

    if (creation < minTimestamp || creation > maxTimestamp) {
      this.logger.warn("Invalid creation timestamp, ignoring", { creation });
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
        this.logger.error(`Error decoding ${cookieDbPath}`, {
          error: error.message,
          file: cookieDbPath,
          name,
          domain,
        });
      } else {
        this.logger.error(`Error decoding ${cookieDbPath}`, {
          error: String(error),
          file: cookieDbPath,
          name,
          domain,
        });
      }
      return [];
    }
  }

  /**
   * Executes the Safari-specific query logic
   * @param name - Name of the cookie to find
   * @param domain - Domain to filter cookies by
   * @param store - Optional store path
   * @param _force - Whether to force operations despite warnings (e.g., locked databases)
   * @returns Array of matching cookies, or empty array if none found
   * @protected
   */
  protected executeQuery(
    name: string,
    domain: string,
    store?: string,
    _force?: boolean,
  ): Promise<ExportedCookie[]> {
    try {
      this.logger.info("Querying cookies", { name, domain, store });

      const home = homedir();
      if (typeof home !== "string" || home.length === 0) {
        this.logger.error("Failed to get home directory");
        return Promise.resolve([]);
      }

      const cookieDbPath = store ?? this.getCookieDbPath(home);
      return Promise.resolve(
        this.decodeCookies(cookieDbPath, name || "%", domain || "%"),
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error("Failed to query cookies", {
          error: error.message,
          name,
          domain,
        });
      } else {
        this.logger.error("Failed to query cookies", {
          error: String(error),
          name,
          domain,
        });
      }
      return Promise.resolve([]);
    }
  }
}
