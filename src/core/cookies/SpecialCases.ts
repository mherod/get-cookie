import type { CookieSpec } from "../../types/schemas";

/**
 * Check if a cookie specification contains wildcard patterns
 * @param cookieSpec - The cookie specification to check
 * @returns True if the cookie spec contains wildcard patterns, false otherwise
 * @example
 * // Check simple cookie spec
 * const simpleSpec = { name: 'session', domain: 'example.com' };
 * console.log(isSpecialCase(simpleSpec)); // false
 *
 * // Check spec with wildcards
 * const wildcardSpec = { name: '*token*', domain: '*.example.com' };
 * console.log(isSpecialCase(wildcardSpec)); // true
 *
 * // Check spec with partial wildcards
 * const partialSpec = { name: 'auth_*', domain: 'api.example.*' };
 * console.log(isSpecialCase(partialSpec)); // true
 */
export function isSpecialCase(cookieSpec: CookieSpec): boolean {
  return (
    cookieSpec.name === "%" ||
    cookieSpec.domain === "%" ||
    cookieSpec.name === "*" ||
    cookieSpec.domain === "*"
  );
}
