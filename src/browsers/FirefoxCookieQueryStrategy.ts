import CookieQueryStrategy from "./CookieQueryStrategy";
import { env, HOME } from "../global";
import { existsSync } from "fs";
import { toStringOrNull } from "../utils";
import { findAllFiles } from "../findAllFiles";
import * as path from "path";
import { doSqliteQuery1 } from "../doSqliteQuery1";
import ExportedCookie from "../ExportedCookie";

export default class FirefoxCookieQueryStrategy implements CookieQueryStrategy {
  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
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
  async #getFirefoxCookie(
    //
    {
      name,
      domain
    }: {
      name: string,
      domain: string
      //
    }
    //
  ) {
    const files: string[] = await findAllFiles({
      path: path.join(
        HOME,
        "Library",
        "Application Support",
        "Firefox",
        "Profiles"
      ),
      name: "cookies.sqlite"
    });
    const all = await Promise.all(
      files.map((file) => {
        return this.#queryCookiesDb(file, name, domain);
      })
    );
    return all.flat();
  }

  #queryCookiesDb(file: string, name: string, domain: string) {
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
      .then((rows) => {
        return rows.map((row) => {
          return {
            domain: row.domain,
            name: row.name,
            value: row.value.toString("utf8")
          };
        });
      })
      .catch(() => []);
  }
}
