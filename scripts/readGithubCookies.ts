// Internal imports
import { ChromeCookieQueryStrategy } from "../src/core/browsers/chrome/ChromeCookieQueryStrategy";
import type { ExportedCookie } from "../src/types/ExportedCookie";
import logger from "../src/utils/logger";

/**
 * Checks if a string matches the basic JWT format
 * @param str - The string to check
 * @returns True if the string matches JWT format, false otherwise
 * @example
 * // Valid JWT format
 * isJWT('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
 * // => true
 *
 * // Invalid format (not three parts)
 * isJWT('not.a.valid.jwt');
 * // => false
 *
 * // Invalid format (not base64url)
 * isJWT('invalid!.token$.here#');
 * // => false
 */
export function isJWT(str: string): boolean {
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
 * Prints information about a cookie and checks if it's a JWT
 * @param cookie - The cookie to print information about
 * @returns Whether this was a JWT cookie
 * @example
 * ```typescript
 * const cookie = { name: 'session', value: 'xyz', domain: 'github.com' };
 * const isJwt = printCookieInfo(cookie);
 * ```
 */
function printCookieInfo(cookie: ExportedCookie): boolean {
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

  const isJwtCookie = isJWT(cookie.value);
  if (isJwtCookie) {
    logger.success("✅ Found JWT cookie");
  }

  logger.info("--------------------");
  return isJwtCookie;
}

/**
 * Prints a summary of found cookies and JWT count
 * @param cookies - The found cookies
 * @param jwtCount - Number of JWT cookies found
 * @example
 * ```typescript
 * const cookies = [{ name: 'session', value: 'xyz' }];
 * printSummary(cookies, 1);
 * ```
 */
function printSummary(cookies: ExportedCookie[], jwtCount: number): void {
  logger.info("\nSummary:");
  logger.info("========");
  logger.info("Total cookies found: %d", cookies.length);
  logger.info("JWT cookies found: %d", jwtCount);
  logger.info("Browsers checked: %s", "Chrome");
  logger.info("Profiles checked: %s", "Default, Profile 2");
  logger.info(
    "Decryption failed: %d",
    cookies.filter((c) => c.meta?.decrypted === false).length,
  );
  logger.info(
    "Successfully decrypted: %d",
    cookies.filter((c) => c.meta?.decrypted === true).length,
  );
}

async function main(): Promise<void> {
  logger.info("\nSearching for GitHub cookies...");
  logger.info("==========================");

  const strategy = new ChromeCookieQueryStrategy();
  const cookies = await strategy.queryCookies("%", "github.com");

  logger.info("\nFound %d GitHub cookies:\n", cookies.length);

  let jwtCount = 0;
  for (const cookie of cookies) {
    if (printCookieInfo(cookie)) {
      jwtCount++;
    }
  }

  printSummary(cookies, jwtCount);
}

main().catch((err) => {
  logger.error("An error occurred:", err);
  process.exit(1);
});
