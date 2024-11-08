import CookieQueryStrategy from "@browsers/CookieQueryStrategy";
import CookieRow, { isCookieRow } from "@/CookieRow";
import ExportedCookie, { isExportedCookie } from "@/ExportedCookie";
import { chromeApplicationSupport } from "./ChromeApplicationSupport";
import { decrypt } from "./decrypt";
import { env } from "@/global";
import { findAllFiles } from "@/findAllFiles";
import { getChromePassword } from "./getChromePassword";
import { merge } from "lodash";
import { flatMapAsync } from "@/util/flatMapAsync";
import { getEncryptedChromeCookie } from "@browsers/getEncryptedChromeCookie";
import { logger } from '@/utils/logger';

export default class ChromeCookieQueryStrategy implements CookieQueryStrategy {
  browserName: string = "Chrome";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    this.ensurePlatformIsMacOS();
    if (env.FIREFOX_ONLY) {
      return [];
    }
    return this.getChromeCookies({
      requireJwt: false,
      name,
      domain,
    });
  }

  private ensurePlatformIsMacOS(): void {
    if (process.platform !== "darwin") {
      throw new Error("This only works on macOS");
    }
  }

  private async getChromeCookies({
    name,
    domain = "%",
    requireJwt = false,
  }: {
    name: string;
    domain: string;
    requireJwt: boolean | undefined;
  }): Promise<ExportedCookie[]> {
    const encryptedDataItems: CookieRow[] = await this.getEncryptedCookies(
      name,
      domain,
    );

    const password: string = await getChromePassword();
    const decryptedCookies: ExportedCookie[] = await this.decryptCookies(
      encryptedDataItems,
      password,
    );

    return decryptedCookies;
  }

  private async getEncryptedCookies(
    name: string,
    domain: string,
  ): Promise<CookieRow[]> {
    try {
      const files: string[] = findAllFiles({
        path: chromeApplicationSupport,
        name: "Cookies",
      });

      const results: CookieRow[] = await flatMapAsync(files, async (file) => {
        return await this.getCookiesFromFile(name, domain, file);
      });

      return results.filter(isCookieRow);
    } catch (error) {
      logger.warn("Error finding encrypted cookies", error);
      return [];
    }
  }

  private async getCookiesFromFile(
    name: string,
    domain: string,
    file: string,
  ): Promise<CookieRow[]> {
    try {
      return await getEncryptedChromeCookie({
        name: name,
        domain: domain,
        file: file,
      });
    } catch (e) {
      logger.warn("Error getting encrypted cookie from file", e);
      return [];
    }
  }

  private async decryptCookies(
    encryptedDataItems: CookieRow[],
    password: string,
  ): Promise<ExportedCookie[]> {
    const decrypted: Promise<ExportedCookie | null>[] = encryptedDataItems
      .filter(({ value }) => value != null && value.length > 0)
      .map(async (cookieRow: CookieRow) => {
        const encryptedValue: Uint8Array | Buffer = cookieRow.value;
        const decryptedValue = await this.decryptValue(
          password,
          encryptedValue,
        );
        return this.createExportedCookie(cookieRow, decryptedValue);
      });
    return (await Promise.all(decrypted)).filter(isExportedCookie);
  }

  private async decryptValue(
    password: string,
    encryptedValue: Uint8Array | Buffer,
  ): Promise<string> {
    let decrypted: string | null;
    try {
      const bufferValue = Buffer.isBuffer(encryptedValue)
        ? encryptedValue
        : Buffer.from(encryptedValue);
      decrypted = await decrypt(password, bufferValue);
    } catch (e) {
      logger.warn("Error decrypting cookie", e);
      decrypted = null;
    }
    return decrypted ?? encryptedValue.toString("utf-8");
  }

  private createExportedCookie(
    cookieRow: CookieRow,
    decryptedValue: string,
  ): ExportedCookie {
    const meta = {};
    merge(meta, cookieRow.meta ?? {});
    const exportedCookie: ExportedCookie = {
      domain: cookieRow.domain,
      name: cookieRow.name,
      value: decryptedValue,
      meta: meta,
    };
    const expiry = cookieRow.expiry;
    const mergeExpiry =
      expiry != null && expiry > 0
        ? {
            expiry: new Date(expiry),
          }
        : {
            expiry: "Infinity",
          };
    merge(exportedCookie, mergeExpiry);
    return exportedCookie;
  }
}
