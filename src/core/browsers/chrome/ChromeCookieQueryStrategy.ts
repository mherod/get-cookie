import { CookieRow, ExportedCookie } from "../../../types/schemas";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../listChromeProfiles";

import { decrypt } from "./decrypt";
import { getChromePassword } from "./getChromePassword";

interface DecryptionContext {
  file: string;
  password: string;
}

function getExpiryDate(expiry: number | undefined | null): Date | "Infinity" {
  if (typeof expiry !== "number" || expiry <= 0) {
    return "Infinity";
  }
  return new Date(expiry);
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
    if (process.platform !== "darwin") {
      this.logger.warn("Platform not supported", {
        platform: process.platform,
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
    password: string,
  ): Promise<ExportedCookie[]> {
    try {
      const encryptedCookies = await getEncryptedChromeCookie({
        name,
        domain,
        file,
      });

      const context: DecryptionContext = { file, password };
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

      const decryptedValue = await decrypt(value, context.password);
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
