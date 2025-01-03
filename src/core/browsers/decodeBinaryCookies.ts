import * as fs from "fs/promises";

import logger from "@utils/logger";

import type { CookieRow } from "../../types/CookieRow";

const consola = logger.withTag("decodeBinaryCookies");

/**
 * Decodes binary cookie files into a structured format
 * Currently this is a placeholder that returns an empty array
 *
 * @param cookieDbPath - The path to the binary cookie database file
 * @returns A promise that resolves to an array of decoded cookie rows
 * @throws {Error} If the cookie file cannot be accessed or read
 * @example
 */
export const decodeBinaryCookies = async (
  cookieDbPath: string,
): Promise<CookieRow[]> => {
  try {
    // Check if file exists
    await fs.access(cookieDbPath);
    return [];
  } catch (error) {
    if (error instanceof Error) {
      consola.warn(
        `Error accessing cookie file ${cookieDbPath}:`,
        error.message,
      );
    } else {
      consola.warn(
        `Error accessing cookie file ${cookieDbPath}: Unknown error`,
      );
    }
    return [];
  }
};
