import { toBuffer, decodeBuffer } from "@utils/bufferUtils";
import { createTaggedLogger, logError } from "@utils/logHelpers";

import {
  BrowserName,
  CookieQueryStrategy,
  CookieRow,
  ExportedCookie,
  ExportedCookieSchema,
} from "../../../types/schemas";
import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../listChromeProfiles";

import { chromeTimestampToDate } from "./chromeTimestamps";
import { decrypt } from "./decrypt";
import { getChromePassword } from "./getChromePassword";

interface DecryptionContext {
  file: string;
  password: string;
}

function createExportedCookie(
  domain: string,
  name: string,
  value: string,
  expiry: number | undefined | null,
  file: string,
  decrypted: boolean,
): ExportedCookie {
  const expiryDate =
    typeof expiry === "number" && expiry > 0
      ? chromeTimestampToDate(expiry)
      : null;

  return {
    domain,
    name,
    value,
    expiry: expiryDate?.getTime() ?? "Infinity",
    meta: {
      file,
      browser: "Chrome",
      decrypted,
    },
  };
}

/**
 * Strategy for querying cookies from Chrome browser
 * @example
 * ```typescript
 * const strategy = new ChromeCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class ChromeCookieQueryStrategy implements CookieQueryStrategy {
  private readonly logger = createTaggedLogger("ChromeCookieQueryStrategy");

  /**
   * The browser name for this strategy
   */
  public readonly browserName: BrowserName = "Chrome";

  /**
   * Queries cookies from Chrome's cookie store
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional path to a specific cookie store file
   * @returns A promise that resolves to an array of exported cookies
   * @example
   * ```typescript
   * const strategy = new ChromeCookieQueryStrategy();
   * const cookies = await strategy.queryCookies('session', 'example.com');
   * console.log(cookies);
   * ```
   */
  public async queryCookies(
    name: string,
    domain: string,
    store?: string,
  ): Promise<ExportedCookie[]> {
    try {
      this.logger.info("Querying cookies", { name, domain, store });

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

      const allCookies = results.flat();
      const validCookies = allCookies.filter((cookie) => {
        const result = ExportedCookieSchema.safeParse(cookie);
        if (!result.success) {
          this.logger.debug("Invalid cookie:", result.error.format());
        }
        return result.success;
      });

      this.logger.debug("Query complete", {
        total: allCookies.length,
        valid: validCookies.length,
      });

      return validCookies;
    } catch (error) {
      if (error instanceof Error) {
        logError("Failed to query cookies", error, { name, domain });
      } else {
        logError("Failed to query cookies", new Error(String(error)), {
          name,
          domain,
        });
      }
      return [];
    }
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
        .map((result) => {
          if (result.status === "fulfilled") {
            return result.value;
          }
          this.logger.error("Failed to process cookie", {
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
          return null;
        })
        .filter((cookie): cookie is ExportedCookie => cookie !== null);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error("Failed to process cookie file", { error, file });
      } else {
        this.logger.error("Failed to process cookie file", {
          error: String(error),
          file,
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
      const valueBuffer = toBuffer(cookie.value);
      const decryptedValue = await decrypt(valueBuffer, context.password);

      return createExportedCookie(
        cookie.domain,
        cookie.name,
        decryptedValue,
        cookie.expiry,
        context.file,
        true,
      );
    } catch (error) {
      // Handle decryption errors
      this.logger.warn("Failed to decrypt cookie", {
        error: error instanceof Error ? error.message : String(error),
        domain: cookie.domain,
        name: cookie.name,
      });

      // Always return a cookie, even if decryption fails
      const valueBuffer = toBuffer(cookie.value);
      const fallbackValue = decodeBuffer(valueBuffer);

      return createExportedCookie(
        cookie.domain,
        cookie.name,
        fallbackValue,
        cookie.expiry,
        context.file,
        false,
      );
    }
  }
}
