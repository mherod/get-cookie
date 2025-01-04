import { homedir } from "os";
import { join } from "path";

import fg from "fast-glob";

import { createTaggedLogger, logWarn } from "@utils/logHelpers";

const logger = createTaggedLogger("FirefoxCookieQueryStrategy");

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
  const home = homedir();
  if (!home) {
    logWarn("FirefoxCookieQuery", "Failed to get home directory");
    return [];
  }

  const patterns = [
    join(home, "Library/Application Support/Firefox/Profiles/*/cookies.sqlite"),
    join(home, ".mozilla/firefox/*/cookies.sqlite"),
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = fg.sync(pattern);
    files.push(...matches);
  }

  logger.debug("Found Firefox cookie files", { files });
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
   * @param store - Optional path to a specific cookie store file
   * @returns A promise that resolves to an array of exported cookies
   */
  public async queryCookies(
    name: string,
    domain: string,
    store?: string,
  ): Promise<ExportedCookie[]> {
    const files = store ?? findFirefoxCookieFiles();
    const fileList = Array.isArray(files) ? files : [files];
    const results: ExportedCookie[] = [];

    for (const file of fileList) {
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
