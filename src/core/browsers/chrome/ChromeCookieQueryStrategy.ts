import { flatMapAsync } from "@utils/flatMapAsync";
import logger from "@utils/logger";

import type { BrowserName } from "../../../types/BrowserName";
import type { CookieQueryStrategy } from "../../../types/CookieQueryStrategy";
import type { CookieRow } from "../../../types/CookieRow";
import type { ExportedCookie } from "../../../types/ExportedCookie";
import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../listChromeProfiles";

import { decrypt } from "./decrypt";
import { getChromePassword } from "./getChromePassword";

const consola = logger.withTag("ChromeCookieQueryStrategy");

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
 * Strategy for querying cookies from Chrome browser
 *
 * @example
 */
export class ChromeCookieQueryStrategy implements CookieQueryStrategy {
  /**
   *
   */
  public readonly browserName: BrowserName = "Chrome";

  /**
   * Queries cookies from Chrome's cookie store
   *
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @returns A promise that resolves to an array of exported cookies
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    if (process.platform !== "darwin") {
      consola.warn("Chrome cookie retrieval only works on macOS");
      return [];
    }

    try {
      const profilePaths = listChromeProfilePaths();
      const cookieFiles = profilePaths.map((path) => path);
      const password = await getChromePassword();

      return flatMapAsync(
        cookieFiles,
        (file) => this.processFile(file, name, domain, password),
        [],
      );
    } catch (error) {
      if (error instanceof Error) {
        consola.error("Failed to retrieve Chrome cookies:", error.message);
      } else {
        consola.error("Failed to retrieve Chrome cookies: Unknown error");
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
    const encryptedCookies = await getEncryptedChromeCookie({
      name,
      domain,
      file,
    });

    const context: DecryptionContext = { file, password };
    return Promise.all(
      encryptedCookies.map((cookie) => this.processCookie(cookie, context)),
    );
  }

  private async processCookie(
    cookie: CookieRow,
    context: DecryptionContext,
  ): Promise<ExportedCookie> {
    try {
      const bufferValue = Buffer.isBuffer(cookie.value)
        ? cookie.value
        : Buffer.from(cookie.value);
      const decryptedValue = await decrypt(bufferValue, context.password);
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
        consola.warn(
          `Error decrypting cookie, falling back to raw value:`,
          error.message,
        );
      } else {
        consola.warn(
          `Error decrypting cookie, falling back to raw value: Unknown error`,
        );
      }
      const rawValue = Buffer.isBuffer(cookie.value)
        ? cookie.value.toString("utf-8")
        : String(cookie.value);
      return createExportedCookie(
        cookie.domain,
        cookie.name,
        rawValue,
        cookie.expiry,
        context.file,
        false,
      );
    }
  }
}
