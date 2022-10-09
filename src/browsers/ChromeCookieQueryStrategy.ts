import CookieQueryStrategy from "./CookieQueryStrategy";
import { execSimple } from "../utils";
import { env, HOME } from "../global";
import { existsSync } from "fs";
import { findAllFiles } from "../findAllFiles";
import * as crypto from "crypto";
import * as path from "path";
import { doSqliteQuery1 } from "../doSqliteQuery1";
import { merge } from "lodash";
import { isCookieRow } from "../IsCookieRow";
import { isExportedCookie } from "../IsExportedCookie";
import { CookieRow } from "../CookieRow";
import { ExportedCookie } from "../ExportedCookie";

export default class ChromeCookieQueryStrategy implements CookieQueryStrategy {
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
      domain
    });
  }
}

async function getPromise1(name: string, domain: string, file: string): Promise<CookieRow[]> {
  try {
    return await getEncryptedChromeCookie({
      name: name,
      domain: domain,
      file: file
    });
  } catch (e) {
    if (env.VERBOSE) {
      console.log("Error getting encrypted cookie", e);
    }
    return [];
  }
}

async function getPromise(name: string, domain: string): Promise<CookieRow[]> {
  try {
    const files: string[] = await findAllFiles({
      path: chromeLocal,
      name: "Cookies"
    });
    const promises: Promise<CookieRow[]>[] = files.map((file) => getPromise1(name, domain, file));
    const results1: Awaited<CookieRow[]>[] = await Promise.all(promises);
    return results1.flat().filter(isCookieRow);
  } catch (error) {
    if (env.VERBOSE) {
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
    if (env.VERBOSE) {
      console.log("Error decrypting cookie", e);
    }
    d = null;
  }
  return d ?? encryptedValue.toString("utf-8");
}

async function getChromeCookies(
  {
    name,
    domain = "%",
    requireJwt = false
  }: {
    name: string;
    domain: string;
    requireJwt: boolean | undefined;
    //
  }
  //
): Promise<ExportedCookie[]> {
  const encryptedDataItems: CookieRow[] = await getPromise(name, domain);
  const password: string = await getChromePassword();
  const decrypted: Promise<ExportedCookie | null>[] = encryptedDataItems
    .filter(({ value }) => value != null && value.length > 0)
    .map(async (cookieRow: CookieRow) => {
      const encryptedValue: Buffer = cookieRow.value;
      const decryptedValue = await decryptValue(password, encryptedValue);
      const meta = {};
      merge(meta, cookieRow.meta ?? {});
      return {
        domain: cookieRow.domain,
        name: cookieRow.name,
        value: decryptedValue,
        meta: meta
      };
    });
  const results: ExportedCookie[] = (await Promise.all(decrypted)).filter(isExportedCookie);
  if (env.VERBOSE) {
    console.log("results", results);
  }
  return results;
}

const chromeLocal = path.join(
  HOME,
  "Library",
  "Application Support",
  "Google",
  "Chrome"
);

async function getEncryptedChromeCookie(
  {
    name,
    domain,
    file = path.join(chromeLocal, "Default", "Cookies")
    //
  }: {
    name: string;
    domain: string;
    file: string;
  }): Promise<CookieRow[]> {
  if (!existsSync(file)) {
    throw new Error(`File ${file} does not exist`);
  }
  if (env.VERBOSE) {
    const s = file.split("/").slice(-3).join("/");
    console.log(`Trying Chrome (at ${s}) cookie ${name} for domain ${domain}`);
  }
  let sql;
  sql = `SELECT encrypted_value, name, host_key FROM cookies`;
  const wildcardRegexp = /^([*%])$/i;
  const specifiedName = name.match(wildcardRegexp) == null;
  const specifiedDomain = domain.match(wildcardRegexp) == null;
  if (specifiedName || specifiedDomain) {
    sql += ` WHERE `;
    if (specifiedName) {
      sql += `name = '${name}'`;
      if (specifiedDomain) {
        sql += ` AND `;
      }
    }
    if (specifiedDomain) {
      sql += `host_key LIKE '${domain}';`;
    }
  }
  return doSqliteQuery1(file, sql);
}

async function getChromePassword(): Promise<string> {
  return execSimple(
    "security find-generic-password -w -s \"Chrome Safe Storage\""
  );
}

async function decrypt(password: crypto.BinaryLike, encryptedData: Buffer): Promise<string> {
  if (typeof password !== "string") {
    throw new Error("password must be a string: " + password);
  }
  let encryptedData1: any;
  encryptedData1 = encryptedData;
  if (encryptedData1 == null || typeof encryptedData1 !== "object") {
    throw new Error("encryptedData must be a object: " + encryptedData1);
  }
  if (!(encryptedData1 instanceof Buffer)) {
    if (Array.isArray(encryptedData1) && encryptedData1[0] instanceof Buffer) {
      [encryptedData1] = encryptedData1;
      if (env.VERBOSE) {
        console.log(
          `encryptedData is an array of buffers, selected first: ${encryptedData1}`
        );
      }
    } else {
      throw new Error("encryptedData must be a Buffer: " + encryptedData1);
    }
    encryptedData1 = Buffer.from(encryptedData1);
  }
  if (env.VERBOSE) {
    console.log(`Trying to decrypt with password ${password}`);
  }
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password,
      "saltysalt",
      1003,
      16,
      "sha1",
      (error, buffer) => {
        try {
          if (error) {
            if (env.VERBOSE) {
              console.log("Error doing pbkdf2", error);
            }
            reject(error);
            return;
          }

          if (buffer.length !== 16) {
            if (env.VERBOSE) {
              console.log(
                "Error doing pbkdf2, buffer length is not 16",
                buffer.length
              );
            }
            reject(new Error("Buffer length is not 16"));
            return;
          }

          const str = new Array(17).join(" ");
          const iv = Buffer.from(str, "binary");
          const decipher = crypto.createDecipheriv("aes-128-cbc", buffer, iv);
          decipher.setAutoPadding(false);

          if (encryptedData1 && encryptedData1.slice) {
            encryptedData1 = encryptedData1.slice(3);
          }

          if (encryptedData1.length % 16 !== 0) {
            if (env.VERBOSE) {
              console.log(
                "Error doing pbkdf2, encryptedData length is not a multiple of 16",
                encryptedData1.length
              );
            }
            reject(new Error("encryptedData length is not a multiple of 16"));
            return;
          }

          let decoded = decipher.update(encryptedData1);
          try {
            decipher.final("utf-8");
          } catch (e) {
            if (env.VERBOSE) {
              console.log("Error doing decipher.final()", e);
            }
            reject(e);
            return;
          }

          const padding = decoded[decoded.length - 1];
          if (padding) {
            decoded = decoded.slice(0, 0 - padding);
          }
          // noinspection JSCheckFunctionSignatures
          const decodedString = decoded.toString("utf8");
          resolve(decodedString);
        } catch (e) {
          reject(e);
        }
      });
  });
}
