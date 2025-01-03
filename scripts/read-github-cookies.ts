// Internal imports
import { ChromeCookieQueryStrategy } from "../src/core/browsers/chrome/ChromeCookieQueryStrategy";
import type { ExportedCookie } from "../src/types/schemas";
import logger from "../src/utils/logger";

/**
 * Checks if a string matches the basic JWT format
 * @param str - The string to check
 * @returns True if the string matches JWT format, false otherwise
 * @example
 * ```typescript
 * // Valid JWT format
 * isJWT('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
 * // => true
 *
 * // Invalid format (not three parts)
 * isJWT('not.a.valid.jwt');
 * // => false
 * ```
 */
function isJWT(str: string): boolean {
  if (!str || typeof str !== "string") {
    return false;
  }

  // JWT consists of three parts separated by dots
  const parts = str.split(".");
  if (parts.length !== 3) {
    return false;
  }

  // Each part should be base64url encoded
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every((part) => base64UrlRegex.test(part));
}

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
 * Validates and checks if a cookie value is a JWT
 * @param value - The value to check
 * @returns Whether the value is a valid JWT
 * @example
 * ```typescript
 * // Check a string value
 * isValidJWT('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
 * // => true
 *
 * // Check an unknown value
 * isValidJWT(undefined);
 * // => false
 *
 * // Check a non-JWT string
 * isValidJWT('not-a-jwt');
 * // => false
 * ```
 */
function isValidJWT(value: unknown): boolean {
  return typeof value === "string" && isJWT(value);
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

  if (cookie.meta?.decrypted === true) {
    logger.success("✅ Successfully decrypted");
  } else {
    logger.warn("❌ Decryption failed");
  }

  if (isValidJWT(cookie.value)) {
    logger.success("✅ Found JWT cookie");
  }

  return true;
}

/**
 * Prints summary information about an array of cookies
 * @param cookies - The array of cookies to summarize
 * @example
 * ```typescript
 * const cookies = [
 *   { name: 'session', value: 'xyz', domain: 'github.com' },
 *   { name: 'token', value: 'jwt.token.here', domain: 'github.com' }
 * ];
 * printSummary(cookies);
 * // Logs:
 * // Found 2 cookies
 * // JWT cookies: 1
 * // Decryption failed: 0
 * // Successfully decrypted: 2
 * ```
 */
function printSummary(cookies: ExportedCookie[]): void {
  const validCookies = cookies.filter(isValidExportedCookie);

  logger.info("Found %d cookies", validCookies.length);
  logger.info(
    "JWT cookies: %d",
    validCookies.filter((c) => isValidJWT(c.value)).length,
  );
  logger.info(
    "Decryption failed: %d",
    validCookies.filter((c) => c.meta?.decrypted === false).length,
  );
  logger.info(
    "Successfully decrypted: %d",
    validCookies.filter((c) => c.meta?.decrypted === true).length,
  );
}

/**
 * Main function to search for and display GitHub cookies
 * @returns Promise that resolves when the search is complete
 */
async function main(): Promise<void> {
  logger.info("\nSearching for GitHub cookies...");
  logger.info("==========================");

  const strategy = new ChromeCookieQueryStrategy();
  const cookies = await strategy.queryCookies("%", "github.com");

  if (!Array.isArray(cookies)) {
    logger.error("Failed to retrieve cookies");
    return;
  }

  logger.info("\nFound %d GitHub cookies:\n", cookies.length);

  for (const cookie of cookies) {
    printCookieInfo(cookie);
  }

  printSummary(cookies);
}

main().catch((err) => {
  logger.error("An error occurred:", err);
  process.exit(1);
});
