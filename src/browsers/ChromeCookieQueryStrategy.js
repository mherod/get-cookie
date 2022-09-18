import AbstractCookieQueryStrategy from "./AbstractCookieQueryStrategy";
import {
  doSqliteQuery1,
  execSimple,
  toStringOrNull,
  toStringValue,
} from "../utils";
import { env } from "../global";
import fs from "fs";
import { decrypt } from "../index2";
import { findAllFiles } from "../findAllFiles";

export default class ChromeCookieQueryStrategy extends AbstractCookieQueryStrategy {
  async queryCookies(name, domain) {
    if (process.platform !== "darwin") {
      throw new Error("This only works on macOS");
    }
    const queriedCookies = await getChromeCookies({
      name,
      domain,
      //
    }).then((cookies) => {
      return cookies.map(toStringValue);
    });
    return [
      ...queriedCookies,
      //
    ];
  }
}

function goodString(input) {
  return input && typeof input !== "string";
}

/**
 *
 * @param {string|undefined} name
 * @param {string} domain
 * @param {boolean} requireJwt
 * @returns {Promise<[string]>}
 */
async function getChromeCookies({ name, domain = "%", requireJwt = false }) {
  if (goodString(name)) {
    throw new Error("name must be a string");
  }
  if (goodString(domain)) {
    throw new Error("domain must be a string");
  }
  const encryptedDataItems = await findAllFiles({
    path: defaultChromeRoot,
    name: "Cookies",
  })
    .then((files) => {
      const promises = files.map((file) => {
        return getEncryptedChromeCookie({
          name: name,
          domain: domain,
          file: file,
        }).catch((e) => {
          if (env.VERBOSE) {
            console.log("Error getting encrypted cookie", e);
          }
          return [];
        });
      });
      return Promise.all(promises)
        .then((results) => results.flat())
        .then((results) => {
          if (env.VERBOSE) {
            console.log("getEncryptedChromeCookie results", results);
          }
          return results.filter((result) => result);
        });
    })
    .catch((error) => {
      if (env.VERBOSE) {
        console.log("error", error);
      }
      return [];
    });
  const password = await getChromePassword();
  if (env.VERBOSE) {
    console.log("encryptedDataItems", encryptedDataItems);
  }
  const decrypted = encryptedDataItems
    .filter((encryptedData) => {
      return encryptedData != null && encryptedData.length > 0;
    })
    .map(async (encryptedData) => {
      if (env.VERBOSE) {
        console.log("Received encrypted", encryptedData);
      }
      let decrypted;
      try {
        decrypted = await decrypt(password, encryptedData);
      } catch (e) {
        if (env.VERBOSE) {
          console.log("Error decrypting cookie", e);
        }
        return null;
      }
      if (decrypted) {
        if (env.VERBOSE) {
          console.log("Decrypted", decrypted);
        }
        return decrypted;
      }
      return null;
    });
  const results = await Promise.all(decrypted);
  if (env.VERBOSE) {
    console.log("results", results);
  }
  return results.map(toStringOrNull);
}

const defaultChromeRoot = `${env.HOME}/Library/Application Support/Google/Chrome`;
const defaultChromeCookies = `${defaultChromeRoot}/Default/Cookies`;

async function getEncryptedChromeCookie({
  name,
  domain,
  file = defaultChromeCookies,
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
  if (!fs.existsSync(file)) {
    throw new Error(`File ${file} does not exist`);
  }
  if (env.VERBOSE) {
    console.log(
      `Trying Chrome (at ${file
        .split("/")
        .slice(-3)
        .join("/")}) cookie ${name} for domain ${domain}`
    );
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
