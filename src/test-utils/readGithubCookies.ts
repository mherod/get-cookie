// Internal imports
import type { ExportedCookie } from "../types/schemas";
import { isJWT } from "../utils/jwt";
import logger from "../utils/logger";

/**
 * Validates that a cookie object has all required properties
 * @param cookie - The cookie object to validate
 * @returns Whether the cookie is a valid ExportedCookie
 * @example
 * ```typescript
 * const cookie = { name: 'session', value: 'xyz', domain: 'github.com' };
 * if (isValidExportedCookie(cookie)) {
 *   // cookie is now typed as ExportedCookie
 *   console.log(cookie.name);
 * }
 * ```
 */
function isValidExportedCookie(cookie: unknown): cookie is ExportedCookie {
  if (
    cookie === null ||
    typeof cookie !== "object" ||
    !("name" in cookie) ||
    !("value" in cookie) ||
    !("domain" in cookie)
  ) {
    return false;
  }

  const { name, value, domain } = cookie as Record<string, unknown>;
  return (
    typeof name === "string" &&
    typeof value === "string" &&
    typeof domain === "string"
  );
}

/**
 * Prints information about a cookie to the console
 * @param cookie - The cookie to print information about
 * @returns Whether the cookie was successfully printed
 * @example
 * ```typescript
 * const cookie = { name: 'session', value: 'xyz', domain: 'github.com' };
 * const success = printCookieInfo(cookie);
 * ```
 */
function printCookieInfo(cookie: unknown): boolean {
  if (!isValidExportedCookie(cookie)) {
    logger.error("Invalid cookie object");
    return false;
  }

  // After validation, we can safely use the cookie properties
  logger.info("Name: %s", cookie.name);
  logger.info("Domain: %s", cookie.domain);
  logger.info("Value: %s", cookie.value);
  logger.info("Expiry: %s", cookie.expiry);
  logger.info("Browser: %s", cookie.meta?.browser ?? "Unknown");
  logger.info("Profile: %s", cookie.meta?.profile ?? "Unknown");

  if (isJWT(cookie.value)) {
    logger.success("✅ Found JWT cookie");
  } else {
    logger.warn("❌ Not a JWT cookie");
  }
  return true;
}

// Export functions that are used elsewhere
/**
 * Export utility functions for cookie validation and printing
 */
export { isValidExportedCookie, printCookieInfo };
