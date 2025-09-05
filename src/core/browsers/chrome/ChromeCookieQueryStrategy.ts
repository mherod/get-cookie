import type { CookieRow, ExportedCookie } from "../../../types/schemas";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../listChromeProfiles";

import { decrypt } from "./decrypt";
import { getChromePassword } from "./getChromePassword";

interface DecryptionContext {
  file: string;
  password: string | Buffer;
  metaVersion?: number;
}

function getExpiryDate(
  expiry: number | undefined | null,
): Date | "Infinity" | undefined {
  // Handle null or undefined expiry
  if (expiry === null || expiry === undefined) {
    return undefined;
  }
  if (typeof expiry !== "number" || expiry <= 0) {
    return "Infinity";
  }

  // Chrome uses microseconds since 1601-01-01 00:00:00 UTC
  // JavaScript Date uses milliseconds since 1970-01-01 00:00:00 UTC
  // The difference is 11644473600 seconds
  const CHROME_EPOCH_OFFSET = 11644473600;
  const unixTimestamp = expiry / 1000000 - CHROME_EPOCH_OFFSET;

  // Convert to milliseconds for JavaScript Date
  return new Date(unixTimestamp * 1000);
}

function createExportedCookie(
  domain: string,
  name: string,
  value: string,
  expiry: number | undefined | null,
  file: string,
  decrypted: boolean,
): ExportedCookie {
  return {
    domain,
    name,
    value,
    expiry: getExpiryDate(expiry),
    meta: {
      file,
      browser: "Chrome",
      decrypted,
    },
  };
}

/**
 * Strategy for querying cookies from Chrome browser.
 * This class extends the BaseCookieQueryStrategy and implements Chrome-specific
 * cookie extraction logic.
 * @example
 * ```typescript
 * const strategy = new ChromeCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class ChromeCookieQueryStrategy extends BaseCookieQueryStrategy {
  /**
   * Creates a new instance of ChromeCookieQueryStrategy
   */
  public constructor() {
    super("ChromeCookieQueryStrategy", "Chrome");
  }

  /**
   * Executes the Chrome-specific query logic
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional path to a specific cookie store file
   * @param _force - Whether to force operations despite warnings (e.g., locked databases)
   * @returns A promise that resolves to an array of exported cookies
   * @protected
   * @example
   * ```typescript
   * // This method is called internally by queryCookies
   * const cookies = await strategy.queryCookies('session', 'example.com');
   * console.log(cookies);
   * ```
   */
  protected async executeQuery(
    name: string,
    domain: string,
    store?: string,
    _force?: boolean,
  ): Promise<ExportedCookie[]> {
    const supportedPlatforms = ["darwin", "win32", "linux"];
    if (!supportedPlatforms.includes(process.platform)) {
      this.logger.warn("Platform not supported", {
        platform: process.platform,
        supportedPlatforms,
      });
      return [];
    }

    const cookieFiles = store ?? listChromeProfilePaths();
    const files = Array.isArray(cookieFiles) ? cookieFiles : [cookieFiles];
    if (files.length === 0) {
      this.logger.warn("No Chrome cookie files found");
      return [];
    }

    const password = await getChromePassword();
    const results = await Promise.all(
      files.map((file) => this.processFile(file, name, domain, password)),
    );

    return results.flat();
  }

  private async processFile(
    file: string,
    name: string,
    domain: string,
    password: string | Buffer,
  ): Promise<ExportedCookie[]> {
    try {
      const encryptedCookies = await getEncryptedChromeCookie({
        name,
        domain,
        file,
      });

      // Get meta version from the Chrome database to determine if hash prefix should be used
      let metaVersion = 0;
      try {
        const Database = await import("better-sqlite3");
        const db = new Database.default(file, { readonly: true });
        try {
          const metaResult = db
            .prepare("SELECT value FROM meta WHERE key = ?")
            .get("version") as { value: string } | undefined;
          metaVersion = metaResult ? Number.parseInt(metaResult.value, 10) : 0;
        } finally {
          db.close();
        }
      } catch (error) {
        // If we can't get meta version, default to 0 (no hash prefix)
        this.logger.debug("Could not retrieve meta version, defaulting to 0", {
          error,
        });
      }

      const context: DecryptionContext = { file, password, metaVersion };
      const results = await Promise.allSettled(
        encryptedCookies.map((cookie) => this.processCookie(cookie, context)),
      );

      return results
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter((cookie): cookie is ExportedCookie => cookie !== null);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error("Failed to process cookie file", {
          error: error.message,
          file,
          name,
          domain,
        });
      } else {
        this.logger.error("Failed to process cookie file", {
          error: String(error),
          file,
          name,
          domain,
        });
      }
      return [];
    }
  }

  private async processCookie(
    cookie: CookieRow,
    context: DecryptionContext,
  ): Promise<ExportedCookie> {
    try {
      const value = Buffer.isBuffer(cookie.value)
        ? cookie.value
        : Buffer.from(String(cookie.value));

      const decryptedValue = await decrypt(
        value,
        context.password,
        context.metaVersion,
      );
      return createExportedCookie(
        cookie.domain,
        cookie.name,
        decryptedValue,
        cookie.expiry,
        context.file,
        true,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.warn("Failed to decrypt cookie", { error });
      } else {
        this.logger.warn("Failed to decrypt cookie", { error: String(error) });
      }
      return createExportedCookie(
        cookie.domain,
        cookie.name,
        cookie.value.toString("utf-8"),
        cookie.expiry,
        context.file,
        false,
      );
    }
  }
}
