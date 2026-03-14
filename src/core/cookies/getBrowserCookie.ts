import type { CookieSpec, ExportedCookie } from "../../types/schemas";
import { getErrorMessage } from "../../utils/errorUtils";
import logger from "../../utils/logger";
import {
  type BrowserType,
  getBrowserDisplayName,
} from "../browsers/BrowserDetector";
import { createBrowserStrategy } from "../browsers/StrategyFactory";

/**
 * Retrieves cookies from a specific browser strategy.
 * @param browser - The browser whose cookie store should be queried
 * @param cookieSpec - The cookie specification containing search criteria
 * @returns An array of ExportedCookie objects that match the specification
 */
export async function getBrowserCookie(
  browser: BrowserType,
  cookieSpec: CookieSpec,
): Promise<ExportedCookie[]> {
  try {
    const strategy = createBrowserStrategy(browser);
    return await strategy.queryCookies(cookieSpec.name, cookieSpec.domain);
  } catch (error: unknown) {
    logger.warn(
      `Error querying ${getBrowserDisplayName(browser)} cookies:`,
      getErrorMessage(error),
    );
    return [];
  }
}

export default getBrowserCookie;
