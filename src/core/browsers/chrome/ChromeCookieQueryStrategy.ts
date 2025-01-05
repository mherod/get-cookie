import type { BrowserName, ExportedCookie } from "../../../types/schemas";
import type { CookieRow } from "../../../types/schemas";
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
  private getValueFromBuffer(
    value: Buffer | string | undefined | null,
  ): string {
    const fallbackValue = value ?? "";
    return Buffer.isBuffer(fallbackValue)
      ? fallbackValue.toString("utf8")
      : String(fallbackValue);
  }

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
      // Handle null/undefined values
      if (encryptedValue === null || encryptedValue === undefined) {
        return {
          decryptedValue: typeof value === "string" ? value : "",
          decrypted: false,
        };
      }

      // Convert to Buffer if needed
      const buffer = Buffer.isBuffer(encryptedValue)
        ? encryptedValue
        : Buffer.from(String(encryptedValue));

      // Skip decryption for empty buffers
      if (buffer.length === 0) {
        return {
          decryptedValue: typeof value === "string" ? value : "",
          decrypted: false,
        };
      }

      const decryptedValue = await this.attemptDecryption(buffer, context);
      return { decryptedValue, decrypted: true };
    } catch (err) {
      logger.error("Failed to decrypt cookie value", {
        error: err instanceof Error ? err.message : String(err),
        file: context.file,
        valueType: typeof value,
        encryptedValueType: typeof encryptedValue,
      });

      return {
        decryptedValue: this.getValueFromBuffer(value),
        decrypted: false,
      };
    }
  }

  private createExportedCookie(
    cookie: ChromeCookieRow,
    value: string,
    decrypted: boolean,
  ): ExportedCookie {
    const expiry = chromeTimestampToDate(cookie.expires_utc);
    return {
      name: cookie.name.trim(),
      value: value.trim(),
      domain: cookie.host_key.trim(),
      expiry: expiry ?? new Date(0),
      meta: {
        browser: "Chrome",
        decrypted,
        path: cookie.path,
        secure: Boolean(cookie.is_secure),
        httpOnly: Boolean(cookie.is_httponly),
        sameSite: cookie.samesite,
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
              encrypted_value: Buffer.isBuffer(row.value)
                ? row.value
                : Buffer.from(String(row.value)),
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

  private validateCookieResult(
    result: PromiseSettledResult<ExportedCookie>,
  ): ExportedCookie | null {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const error =
      result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason));
    logger.error("Failed to process cookie", {
      error: error.message,
      type: error.name,
      stack: error.stack,
    });
    return null;
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
