import * as path from "path";
import CookieQueryStrategy from "../CookieQueryStrategy";
import { HOME } from "../../global";
import { existsSync } from "fs";
import { findAllFiles } from "../../findAllFiles";
import ExportedCookie from "../../ExportedCookie";
import CookieRow from "../../CookieRow";
import CookieSpec from "../../CookieSpec";
import { specialCases } from "../../SpecialCases";
import { parsedArgs } from "../../argv";
import { querySqliteThenTransform } from "../QuerySqliteThenTransform";

export default class FirefoxCookieQueryStrategy implements CookieQueryStrategy {
  browserName: string = "Firefox";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    if (process.platform !== "darwin") {
      // TODO: implement
      return [];
    }
    if (parsedArgs.browser !== "firefox") {
      return [];
    }
    const cookies: CookieRow[] = await this.getFirefoxCookie({ name, domain });
    if (Array.isArray(cookies)) {
      return cookies.map((cookie: CookieRow) => {
        return {
          domain: cookie.domain,
          name: cookie.name,
          value: Buffer.isBuffer(cookie.value)
            ? cookie.value.toString("utf8")
            : Buffer.from(cookie.value).toString("utf8"),
        };
      });
    } else {
      return [];
    }
  }

  private async getFirefoxCookie(
    { name, domain }: CookieSpec, //
  ): Promise<CookieRow[]> {
    if (!HOME) {
      throw new Error("HOME environment variable is not set");
    }
    const files: string[] = findAllFiles({
      path: path.join(
        HOME,
        "Library",
        "Application Support",
        "Firefox",
        "Profiles",
      ),
      name: "cookies.sqlite",
    });
    const all: CookieRow[][] = await Promise.all(
      files.map(async (file: string) => {
        return await this.queryCookiesDb(file, name, domain);
      }),
    );
    // flatten
    return all.flat();
  }

  private async queryCookiesDb(
    file: string,
    name: string,
    domain: string,
  ): Promise<CookieRow[]> {
    if (!existsSync(file)) {
      throw new Error(`File ${file} does not exist`);
    }
    let sql: string;
    //language=SQL
    sql = "SELECT value, name, host FROM moz_cookies";
    const { specifiedName, specifiedDomain } = specialCases({ name, domain });
    if (specifiedName || specifiedDomain) {
      sql += ` WHERE `;
      if (specifiedName) {
        sql += `name = '${name}'`;
        if (specifiedDomain) {
          sql += ` AND `;
        }
      }
      if (specifiedDomain) {
        sql += `host LIKE '${domain}';`;
      }
    }
    const rowTransform = (row: any): CookieRow => {
      // row is object key by column name
      const value = row.value as string;
      return {
        domain: row.domain as string,
        name: row.name as string,
        value: Buffer.from(value, "utf8"),
      };
    };
    try {
      return await querySqliteThenTransform({
        file,
        sql,
        rowTransform,
      });
    } catch (e) {
      console.error(`Error querying ${file}`, e);
      return [];
    }
  }
}
