import type { BrowserName, ExportedCookie } from "../../../types/schemas";
import type { CookieRow } from "../../../types/schemas";
import { toBuffer, toString } from "../../../utils/bufferUtils";
import logger from "../../../utils/logger";
import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../listChromeProfiles";

import { chromeTimestampToDate } from "./chromeTimestamps";
import { decrypt } from "./decrypt";
import { getChromePassword } from "./getChromePassword";
import type { ChromeCookieRow } from "./types";

interface DecryptionContext {
  file: string;
  password: string;
}

interface DecryptionResult {
  decryptedValue: string;
  decrypted: boolean;
}

/**
 * Strategy for querying and decrypting Chrome browser cookies
 */
export class ChromeCookieQueryStrategy {
  private async attemptDecryption(
    buffer: Buffer,
    context: DecryptionContext,
  ): Promise<string> {
    return decrypt(buffer, context.password);
  }

  private async decryptValue(
    value: Buffer | string | undefined | null,
    encryptedValue: Buffer | string | undefined | null,
    context: DecryptionContext,
  ): Promise<DecryptionResult> {
    try {
      // Handle empty or invalid values with explicit null/undefined check
      if (encryptedValue === null || encryptedValue === undefined) {
        return {
          decryptedValue: toString(value),
          decrypted: false,
        };
      }

      // Convert to a buffer with our utility
      const buffer = toBuffer(encryptedValue);
      if (buffer.length === 0) {
        return {
          decryptedValue: toString(value),
          decrypted: false,
        };
      }

      // Attempt decryption
      try {
        const decryptedValue = await this.attemptDecryption(buffer, context);
        return { decryptedValue, decrypted: true };
      } catch {
        // If decryption fails, fall back to the original value
        return {
          decryptedValue: toString(value),
          decrypted: false,
        };
      }
    } catch (err) {
      logger.error("Failed to decrypt cookie value", {
        error: err instanceof Error ? err.message : String(err),
        file: context.file,
        valueType: typeof value,
        encryptedValueType: typeof encryptedValue,
      });

      return {
        decryptedValue: toString(value),
        decrypted: false,
      };
    }
  }

  private createExportedCookie(
    cookie: ChromeCookieRow,
    value: string,
    decrypted: boolean,
  ): ExportedCookie {
    // Add logging to debug the cookie data
    logger.debug("Creating exported cookie", {
      cookieName: cookie.name,
      cookieValue: value,
      cookieDomain: cookie.host_key,
      cookieExpiry: cookie.expires_utc,
    });

    // Safely handle potentially undefined values
    const name = toString(cookie.name);
    const domain = toString(cookie.host_key);
    const cookieValue = toString(value);
    const expiryDate = cookie.expires_utc ? chromeTimestampToDate(cookie.expires_utc) : null;

    return {
      name: name.trim(),
      value: cookieValue.trim(),
      domain: domain.trim(),
      expiry: expiryDate ? expiryDate.getTime() : 0,
      meta: {
        browser: "Chrome",
        decrypted,
        path: cookie.path || "/",
        secure: Boolean(cookie.is_secure),
        httpOnly: Boolean(cookie.is_httponly),
        sameSite: cookie.samesite || "",
      },
    };
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
        encryptedCookies.map(
          async (row: CookieRow): Promise<ExportedCookie> => {
            const cookie: ChromeCookieRow = {
              name: row.name,
              value: row.value,
              encrypted_value: toBuffer(row.value),
              host_key: row.domain,
              path: "/",
              expires_utc: row.expiry ?? 0,
              is_secure: 0,
              is_httponly: 0,
              samesite: "",
            };

            const { decryptedValue, decrypted } = await this.decryptValue(
              cookie.value,
              cookie.encrypted_value,
              context,
            );

            return this.createExportedCookie(cookie, decryptedValue, decrypted);
          },
        ),
      );

      const validCookies = results
        .map((result) => this.validateCookieResult(result))
        .filter((cookie): cookie is ExportedCookie => cookie !== null);

      logger.debug("Processed cookies", {
        total: results.length,
        valid: validCookies.length,
        file,
      });

      return validCookies;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("Failed to process cookie file", {
        error: error.message,
        file,
        name,
        domain,
      });
      return [];
    }
  }

  private isValidCookie(cookie: ExportedCookie): boolean {
    return (
      typeof cookie.name === "string" &&
      typeof cookie.value === "string" &&
      typeof cookie.domain === "string" &&
      typeof cookie.expiry === "number"
    );
  }

  private normalizeCookie(cookie: ExportedCookie): ExportedCookie {
    return {
      ...cookie,
      value: String(cookie.value),
      expiry: typeof cookie.expiry === "number" ? cookie.expiry : 0,
    };
  }

  private handleRejectedCookie(reason: unknown): void {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error("Failed to process cookie", {
      error: error.message,
      type: error.name,
      stack: error.stack,
    });
  }

  private validateCookieResult(
    result: PromiseSettledResult<ExportedCookie>,
  ): ExportedCookie | null {
    try {
      if (result.status === "fulfilled") {
        const cookie = result.value;
        if (this.isValidCookie(cookie)) {
          return this.normalizeCookie(cookie);
        }
      } else {
        this.handleRejectedCookie(result.reason);
      }

      return null;
    } catch (err) {
      logger.error("Failed to validate cookie", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Gets cookies from Chrome's cookie store
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param file - Optional path to the cookie file
   * @returns A promise that resolves to an array of exported cookies
   */
  public async queryCookies(
    name: string,
    domain: string,
    file?: string | null,
  ): Promise<ExportedCookie[]> {
    try {
      const cookieFiles = file ?? listChromeProfilePaths();
      const cookieFilePaths = Array.isArray(cookieFiles)
        ? cookieFiles
        : [cookieFiles];

      if (cookieFilePaths.length === 0) {
        logger.warn("No Chrome cookie files found");
        return [];
      }

      const password = await getChromePassword();
      const allCookies = await Promise.all(
        cookieFilePaths.map((cookieFile) =>
          this.processFile(cookieFile, name, domain, password),
        ),
      );

      return allCookies.flat();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("Failed to query cookies", {
        error: error.message,
        name,
        domain,
        file,
      });
      return [];
    }
  }

  /**
   * Gets the name of the browser
   * @returns The browser name
   */
  public get browserName(): BrowserName {
    return "Chrome";
  }
}
