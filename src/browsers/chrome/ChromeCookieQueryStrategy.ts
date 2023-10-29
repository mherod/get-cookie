import CookieQueryStrategy from "../CookieQueryStrategy";
import CookieRow, { isCookieRow } from "../../CookieRow";
import ExportedCookie from "../../ExportedCookie";
import { chromeApplicationSupport } from "./ChromeApplicationSupport";
import { decrypt } from "./decrypt";
import { env } from "../../global";
import { findAllFiles } from "../../findAllFiles";
import { getChromePassword } from "./getChromePassword";
import { isExportedCookie } from "../../ExportedCookie";
import { merge } from "lodash";
import { parsedArgs } from "../../argv";
import { flatMapAsync } from "../../util/flatMapAsync";
import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import logger from "../../logger";

export const consola = logger.withTag("ChromeCookieQueryStrategy");

export default class ChromeCookieQueryStrategy implements CookieQueryStrategy {
  browserName = "Chrome";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    if (process.platform !== "darwin") {
      throw new Error("This only works on macOS");
    }
    if (env.FIREFOX_ONLY) {
      return [];
    }
    return getChromeCookies({
      requireJwt: false,
      name,
      domain,
    });
  }
}

async function getPromise1(
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
    if (parsedArgs.verbose) {
      console.log("Error getting encrypted cookie", e);
    }
    return [];
  }
}

async function getPromise(name: string, domain: string): Promise<CookieRow[]> {
  try {
    const files: string[] = findAllFiles({
      path: chromeApplicationSupport,
      name: "Cookies",
    });
    const results1: CookieRow[] = await flatMapAsync(files, async (file) => {
      return await getPromise1(name, domain, file);
    });
    return results1.filter(isCookieRow);
  } catch (error) {
    if (parsedArgs.verbose) {
      console.log("error", error);
    }
    return [];
  }
}

async function decryptValue(password: string, encryptedValue: Buffer) {
  let d: string | null;
  try {
    d = await decrypt(password, encryptedValue);
  } catch (e) {
    if (parsedArgs.verbose) {
      console.log("Error decrypting cookie", e);
    }
    d = null;
  }
  return d ?? encryptedValue.toString("utf-8");
}

async function getChromeCookies({
  name,
  domain = "%",
  requireJwt = false,
}: {
  name: string;
  domain: string;
  requireJwt: boolean | undefined;
  //
}): //
Promise<ExportedCookie[]> {
  const encryptedDataItems: CookieRow[] = await getPromise(name, domain);
  const password: string = await getChromePassword();
  const decrypted: Promise<ExportedCookie | null>[] = encryptedDataItems
    .filter(({ value }) => value != null && value.length > 0)
    .map(async (cookieRow: CookieRow) => {
      const encryptedValue: Buffer = cookieRow.value;
      const decryptedValue = await decryptValue(password, encryptedValue);
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
    });
  const results: ExportedCookie[] = (await Promise.all(decrypted)).filter(
    isExportedCookie,
  );
  if (parsedArgs.verbose) {
    console.log("results", results);
  }
  return results;
}
