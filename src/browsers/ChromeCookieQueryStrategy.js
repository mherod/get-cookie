import AbstractCookieQueryStrategy from "./AbstractCookieQueryStrategy";
import {
  doSqliteQuery1,
  execSimple,
  invalidString,
  toStringOrNull,
  toStringValue,
} from "../utils";
import { env, HOME } from "../global";
import { existsSync } from "fs";
import { findAllFiles } from "../findAllFiles";
import crypto from "crypto";
import * as path from "path";

export default class ChromeCookieQueryStrategy extends AbstractCookieQueryStrategy {
  async queryCookies(name, domain) {
    if (process.platform !== "darwin") {
      throw new Error("This only works on macOS");
    }
    if (env.FIREFOX_ONLY) {
      return [];
    }
    const cookies = await getChromeCookies({ name, domain });
    return cookies.map(toStringValue);
  }
}

async function getPromise1(name, domain, file) {
  try {
    return await getEncryptedChromeCookie({
      name: name,
      domain: domain,
      file: file,
    });
  } catch (e) {
    if (env.VERBOSE) {
      console.log("Error getting encrypted cookie", e);
    }
    return [];
  }
}

async function getPromise(name, domain) {
  try {
    const files = await findAllFiles({
      path: chromeLocal,
      name: "Cookies",
    });
    const promises = files.map((file) => getPromise1(name, domain, file));
    const results1 = await Promise.all(promises);
    const results2 = results1.flat();
    if (env.VERBOSE) {
      console.log("getEncryptedChromeCookie results", results2);
    }
    return results2.filter((result) => result);
  } catch (error) {
    if (env.VERBOSE) {
      console.log("error", error);
    }
    return [];
  }
}

/**
 *
 * @param {string|undefined} name
 * @param {string} domain
 * @param {boolean} requireJwt
 * @returns {Promise<[string]>}
 */
async function getChromeCookies({ name, domain = "%", requireJwt = false }) {
  if (invalidString(name)) {
    throw new Error("name must be a string");
  }
  if (invalidString(domain)) {
    throw new Error("domain must be a string");
  }
  const encryptedDataItems = await getPromise(name, domain);
  const password = await getChromePassword();
  const decrypted = encryptedDataItems
    .filter((encryptedData) => {
      return encryptedData != null && encryptedData.length > 0;
    })
    .map(async (encryptedData) => {
      if (env.VERBOSE) {
        console.log("Received encrypted", encryptedData);
      }
      let d;
      try {
        d = await decrypt(password, encryptedData);
      } catch (e) {
        if (env.VERBOSE) {
          console.log("Error decrypting cookie", e);
        }
        return null;
      }
      if (d) {
        if (env.VERBOSE) {
          console.log("Decrypted", d);
        }
        return d;
      }
      return null;
    });
  const results = await Promise.all(decrypted);
  if (env.VERBOSE) {
    console.log("results", results);
  }
  return results.map(toStringOrNull);
}

const chromeLocal = path.join(
  HOME,
  "Library",
  "Application Support",
  "Google",
  "Chrome"
);

async function getEncryptedChromeCookie({
  name,
  domain,
  file = path.join(chromeLocal, "Default", "Cookies"),
}) {
  if (name && typeof name !== "string") {
    throw new Error("name must be a string");
  }
  if (domain && typeof domain !== "string") {
    throw new Error("domain must be a string");
  }
  if (file && typeof file !== "string") {
    throw new Error("file must be a string");
  }
  if (!existsSync(file)) {
    throw new Error(`File ${file} does not exist`);
  }
  if (env.VERBOSE) {
    const s = file.split("/").slice(-3).join("/");
    console.log(`Trying Chrome (at ${s}) cookie ${name} for domain ${domain}`);
  }
  let sql;
  sql = `SELECT encrypted_value FROM cookies`;
  if (typeof name === "string" || typeof domain === "string") {
    sql += ` WHERE `;
    if (typeof name === "string") {
      sql += `name = '${name}'`;
      if (typeof domain === "string") {
        sql += ` AND `;
      }
    }
    if (typeof domain === "string") {
      sql += `host_key LIKE '${domain}';`;
    }
  }
  return doSqliteQuery1(file, sql);
}

/**
 *
 * @returns {Promise<string>}
 */
async function getChromePassword() {
  return execSimple(
    'security find-generic-password -w -s "Chrome Safe Storage"'
  );
}

/**
 *
 * @param {string} password
 * @param {Buffer} encryptedData
 * @returns {Promise<string>}
 */
async function decrypt(password, encryptedData) {
  if (typeof password !== "string") {
    throw new Error("password must be a string: " + password);
  }
  let encryptedData1;
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
    crypto.pbkdf2(password, "saltysalt", 1003, 16, "sha1", (error, buffer) => {
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

        const iv = new Buffer.from(new Array(17).join(" "), "binary");
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
        decoded = decoded.toString("utf8");
        resolve(decoded);
      } catch (e) {
        reject(e);
      }
    });
  });
}
