import fg from "fast-glob";
import type { CookieRow, ExportedCookie } from "../../../types/schemas";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import {
  type ChromiumBrowser,
  getChromiumBrowserPath,
} from "../chrome/ChromiumBrowsers";
import { decrypt } from "../chrome/decrypt";
import { getChromePassword } from "../chrome/getChromePassword";
import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";

interface DecryptionContext {
  file: string;
  password: string | Buffer;
  browser: ChromiumBrowser;
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

  // Chrome/Chromium uses microseconds since 1601-01-01 00:00:00 UTC
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
  browser: ChromiumBrowser,
  decrypted: boolean,
): ExportedCookie {
  return {
    domain,
    name,
    value,
    expiry: getExpiryDate(expiry),
    meta: {
      file,
      browser: browser.charAt(0).toUpperCase() + browser.slice(1),
      decrypted,
    },
  };
}

/**
 * Strategy for querying cookies from Chromium-based browsers (Chrome, Brave, Edge, etc.)
 * This class extends the BaseCookieQueryStrategy and implements Chromium-specific
 * cookie extraction logic that works across multiple browsers.
 */
export class ChromiumCookieQueryStrategy extends BaseCookieQueryStrategy {
  private browser: ChromiumBrowser;

  /**
   * Creates a new instance of ChromiumCookieQueryStrategy
   * @param browser - The Chromium-based browser to query (chrome, brave, edge, etc.)
   */
  public constructor(browser: ChromiumBrowser = "chrome") {
    const browserName = browser.charAt(0).toUpperCase() + browser.slice(1);
    // Use "Chrome" for the base class since it expects specific browser names
    super(`${browserName}CookieQueryStrategy`, "Chrome");
    this.browser = browser;
  }

  /**
   * Lists all cookie file paths for the specified browser
   */
  private listBrowserCookiePaths(): string[] {
    try {
      const browserPath = getChromiumBrowserPath(this.browser);
      const files = fg.sync("./**/Cookies", {
        cwd: browserPath,
        absolute: true,
      });
      this.logger.debug(
        `Found ${files.length} cookie files for ${this.browser}`,
      );
      return files;
    } catch (error) {
      this.logger.warn(`Failed to find ${this.browser} cookie files`, {
        error,
      });
      return [];
    }
  }

  /**
   * Executes the Chromium-specific query logic
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

    const cookieFiles = store ?? this.listBrowserCookiePaths();
    const files = Array.isArray(cookieFiles) ? cookieFiles : [cookieFiles];
    if (files.length === 0) {
      this.logger.warn(`No ${this.browser} cookie files found`);
      return [];
    }

    try {
      const password = await getChromePassword();
      const results = await Promise.all(
        files.map((file) => this.processFile(file, name, domain, password)),
      );
      return results.flat();
    } catch (error) {
      this.logger.error(`Failed to get ${this.browser} password`, { error });
      return [];
    }
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

      const context: DecryptionContext = {
        file,
        password,
        browser: this.browser,
      };
      const results = await Promise.allSettled(
        encryptedCookies.map((cookie) => this.processCookie(cookie, context)),
      );

      return results
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter((cookie): cookie is ExportedCookie => cookie !== null);
    } catch (error) {
      this.logger.error(`Failed to process ${this.browser} cookie file`, {
        error: error instanceof Error ? error.message : String(error),
        file,
        name,
        domain,
      });
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
        context.browser,
        true,
      );
    } catch (error) {
      this.logger.warn(`Failed to decrypt ${this.browser} cookie`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return createExportedCookie(
        cookie.domain,
        cookie.name,
        cookie.value.toString("utf-8"),
        cookie.expiry,
        context.file,
        context.browser,
        false,
      );
    }
  }
}
