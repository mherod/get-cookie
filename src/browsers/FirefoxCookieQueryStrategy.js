import AbstractCookieQueryStrategy from "./AbstractCookieQueryStrategy";
import { env, HOME } from "../global";
import { existsSync } from "fs";
import { doSqliteQuery1, toStringOrNull } from "../utils";
import { findAllFiles } from "../findAllFiles";
import * as path from "path";

export default class FirefoxCookieQueryStrategy extends AbstractCookieQueryStrategy {
  async queryCookies(name, domain) {
    if (process.platform !== "darwin") {
      throw new Error("This only works on macOS");
    }
    if (env.CHROME_ONLY) {
      return [];
    }
    const cookies = await this.#getFirefoxCookie({ name, domain });
    return Array.isArray(cookies) ? cookies.map(toStringOrNull) : [];
  }

  /**
   *
   * @param name
   * @param domain
   * @returns {Promise<Buffer>}
   */
  async #getFirefoxCookie({ name, domain }) {
    if (name && typeof name !== "string") {
      throw new Error("name must be a string");
    }
    if (domain && typeof domain !== "string") {
      throw new Error("domain must be a string");
    }
    const files = await findAllFiles({
      path: path.join(
        HOME,
        "Library",
        "Application Support",
        "Firefox",
        "Profiles"
      ),
      name: "cookies.sqlite",
    });
    const all = Promise.all(
      files.map((file) => {
        return this.#queryCookiesDb(file, name, domain);
      })
    );
    return all.flat();
  }

  #queryCookiesDb(file, name, domain) {
    if (file && !existsSync(file)) {
      throw new Error(`File ${file} does not exist`);
    }
    if (env.VERBOSE) {
      console.log(`Trying Firefox cookie ${name} for domain ${domain}`);
    }
    let sql;
    //language=SQL
    sql = "SELECT value FROM moz_cookies";
    if (typeof name === "string" || typeof domain === "string") {
      sql += ` WHERE `;
      if (typeof name === "string") {
        sql += `name = '${name}'`;
        if (typeof domain === "string") {
          sql += ` AND `;
        }
      }
      if (typeof domain === "string") {
        sql += `host LIKE '${domain}';`;
      }
    }
    return doSqliteQuery1(file, sql)
      .then((rows) => rows.map(toStringOrNull))
      .catch(() => []);
  }
}
