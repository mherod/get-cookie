import { join } from "path";

import { sync } from "glob";

import { logDebug, logWarn } from "@utils/logHelpers";

import {
  BrowserName,
  CookieQueryStrategy,
  ExportedCookie,
} from "../../../types/schemas";
import { querySqliteThenTransform } from "../QuerySqliteThenTransform";

interface FirefoxCookieRow {
  name: string;
  value: string;
  domain: string;
  expiry: number;
}

/**
 * Find all Firefox cookie database files
 * @returns An array of file paths to Firefox cookie databases
 */
function findFirefoxCookieFiles(): string[] {
  const files: string[] = [];
  const homedir = process.env.HOME;

  if (typeof homedir !== "string" || homedir.length === 0) {
    logWarn("FirefoxCookieQuery", "HOME environment variable not set");
    return files;
  }

  const patterns = [
    join(
      homedir,
      "Library/Application Support/Firefox/Profiles/*/cookies.sqlite",
    ),
    join(homedir, ".mozilla/firefox/*/cookies.sqlite"),
  ];

  for (const pattern of patterns) {
    const matches = sync(pattern);
    files.push(...matches);
  }

  logDebug("FirefoxCookieQuery", "Found Firefox cookie files", { files });
  return files;
}

/**
 * Strategy for querying cookies from Firefox browser
 * @example
 */
export class FirefoxCookieQueryStrategy implements CookieQueryStrategy {
  /**
   *
   */
  public readonly browserName: BrowserName = "Firefox";

  /**
   * Queries cookies from Firefox's cookie store
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @returns A promise that resolves to an array of exported cookies
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    const files = findFirefoxCookieFiles();
    const results: ExportedCookie[] = [];

    for (const file of files) {
      try {
        const cookies = await querySqliteThenTransform<
          FirefoxCookieRow,
          ExportedCookie
        >({
          file,
          sql: "SELECT name, value, host as domain, expiry FROM moz_cookies WHERE name = ? AND host LIKE ?",
          params: [name, `%${domain}%`],
          rowTransform: (row) => ({
            name: row.name,
            value: row.value,
            domain: row.domain,
            expiry: row.expiry > 0 ? new Date(row.expiry * 1000) : "Infinity",
            meta: {
              file,
              browser: "Firefox",
              decrypted: false,
            },
          }),
        });

        results.push(...cookies);
      } catch (error) {
        if (error instanceof Error) {
          logWarn(
            "FirefoxCookieQuery",
            `Error reading Firefox cookie file ${file}`,
            { error: error.message },
          );
        } else {
          logWarn(
            "FirefoxCookieQuery",
            `Error reading Firefox cookie file ${file}`,
          );
        }
      }
    }

    return results;
  }
}
