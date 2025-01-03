// Internal imports
import { ChromeCookieQueryStrategy } from "../src/core/browsers/chrome/ChromeCookieQueryStrategy";
import type { ExportedCookie } from "../src/types/ExportedCookie";

/**
 * Checks if a string matches the basic JWT format
 * @param str - The string to check
 * @returns True if the string matches JWT format, false otherwise
 */
export function isJWT(str: string): boolean {
  if (!str || typeof str !== 'string') {return false;}

  // JWT consists of three parts separated by dots
  const parts = str.split('.');
  if (parts.length !== 3) {return false;}

  // Each part should be base64url encoded
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => base64UrlRegex.test(part));
}

/**
 * Prints information about a single cookie
 * @param cookie - The cookie to print information about
 * @returns Whether this was a JWT cookie
 */
function printCookieInfo(cookie: ExportedCookie): boolean {
  console.log("Name:", cookie.name);
  console.log("Domain:", cookie.domain);
  console.log("Value:", cookie.value);
  console.log("Expiry:", cookie.expiry);
  console.log("Browser:", cookie.meta?.browser ?? "Unknown");
  console.log("Profile:", cookie.meta?.profile ?? "Unknown");

  if (cookie.meta?.decrypted === true) {
    console.log("✅ Successfully decrypted");
  } else {
    console.log("❌ Decryption failed");
  }

  const isJwtCookie = isJWT(cookie.value);
  if (isJwtCookie) {
    console.log("✅ Found JWT cookie");
  }

  console.log("--------------------");
  return isJwtCookie;
}

/**
 * Prints a summary of the cookie search results
 * @param cookies - The found cookies
 * @param jwtCount - Number of JWT cookies found
 */
function printSummary(cookies: ExportedCookie[], jwtCount: number): void {
  console.log("\nSummary:");
  console.log("========");
  console.log("Total cookies found:", cookies.length);
  console.log("JWT cookies found:", jwtCount);
  console.log("Browsers checked:", "Chrome");
  console.log("Profiles checked:", "Default, Profile 2");
  console.log("Decryption failed:", cookies.filter(c => c.meta?.decrypted === false).length);
  console.log("Successfully decrypted:", cookies.filter(c => c.meta?.decrypted === true).length);
}

async function main(): Promise<void> {
  console.log("\nSearching for GitHub cookies...");
  console.log("==========================");

  const strategy = new ChromeCookieQueryStrategy();
  const cookies = await strategy.queryCookies("%", "github.com");

  console.log("\nFound", cookies.length, "GitHub cookies:\n");

  let jwtCount = 0;
  for (const cookie of cookies) {
    if (printCookieInfo(cookie)) {
      jwtCount++;
    }
  }

  printSummary(cookies, jwtCount);
}

main().catch(console.error);
