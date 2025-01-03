import { existsSync } from "fs";
import { join } from "path";

import glob from "fast-glob";

import logger from "@utils/logger";

import type { CookieRow } from "../../types/CookieRow";

import { chromeApplicationSupport } from "./chrome/ChromeApplicationSupport";
import { querySqliteThenTransform } from "./QuerySqliteThenTransform";

const consola = logger.withTag("getEncryptedChromeCookie");

interface ChromeCookieRow {
  encrypted_value: Buffer;
  name: string;
  host_key: string;
  expires_utc: number;
}

/**
 * Get paths to Chrome cookie files
 *
 * @returns A promise that resolves to an array of file paths
 */
async function getCookieFiles(): Promise<string[]> {
  const patterns = [
    join(chromeApplicationSupport, "Default/Cookies"),
    join(chromeApplicationSupport, "Profile */Cookies"),
    join(chromeApplicationSupport, "Profile Default/Cookies"),
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern);
    files.push(...matches);
  }

  consola.info(`Found ${files.length} Chrome cookie files:`, files);
  return files;
}

/**
 * Retrieve encrypted cookies from Chrome's cookie store
 *
 * @param params - Parameters for querying Chrome cookies
 * @param params.name - The name of the cookie to retrieve
 * @param params.domain - The domain to retrieve cookies from
 * @param params.file - The path to Chrome's cookie file
 * @returns A promise that resolves to an array of encrypted cookies
 * @throws {Error} If the cookie file cannot be accessed or read
 * @example
 */
export async function getEncryptedChromeCookie({
  name,
  domain,
  file,
}: {
  name: string;
  domain: string;
  file: string;
}): Promise<CookieRow[]> {
  const cookieFiles = file ? [file] : await getCookieFiles();
  if (cookieFiles.length === 0) {
    consola.warn("No Chrome cookie files found");
    return [];
  }

  const results: CookieRow[] = [];
  for (const cookieFile of cookieFiles) {
    if (!existsSync(cookieFile)) {
      consola.warn(`Cookie file does not exist: ${cookieFile}`);
      continue;
    }

    try {
      const sql =
        name === "%"
          ? `SELECT name, encrypted_value, host_key, expires_utc FROM cookies WHERE host_key LIKE ?`
          : `SELECT name, encrypted_value, host_key, expires_utc FROM cookies WHERE name = ? AND host_key LIKE ?`;
      const params = name === "%" ? [`%${domain}%`] : [name, `%${domain}%`];

      consola.info(`SQL query: ${sql}`);
      const rows = await querySqliteThenTransform<ChromeCookieRow, CookieRow>({
        file: cookieFile,
        sql,
        params,
        rowTransform: (row: ChromeCookieRow): CookieRow => ({
          name: row.name,
          domain: row.host_key,
          value: row.encrypted_value,
          expiry: row.expires_utc,
        }),
      });
      consola.info(`Found ${rows.length} cookies in ${cookieFile}`);
      results.push(...rows);
    } catch (error) {
      consola.warn(`Error reading cookie file ${cookieFile}:`, error);
    }
  }

  consola.info(`Total cookies found: ${results.length}`);
  return results;
}
