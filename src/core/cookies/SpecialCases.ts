import type { CookieSpec } from "../../types/CookieSpec";

/**
 * Check if a cookie specification contains wildcard patterns
 * A cookie spec is considered special if it contains '%' in either name or domain
 * @param cookieSpec - The cookie specification to check
 * @returns True if the cookie spec contains wildcard patterns, false otherwise
 */
export function isSpecialCase(cookieSpec: CookieSpec): boolean {
  return (
    cookieSpec.name === "%" ||
    cookieSpec.domain === "%" ||
    cookieSpec.name === "*" ||
    cookieSpec.domain === "*"
  );
}
