/**
 * Specification for identifying a cookie by its domain and name.
 * Used to query specific cookies from browser storage.
 * @remarks
 * - Domain matching is exact unless using wildcards.
 * - Name can be "*" to match all cookies for a domain.
 * - Leading dots in domains match all subdomains.
 * @example
 * ```typescript
 * import { CookieSpec } from 'get-cookie';
 *
 * // Basic cookie specification
 * const cookieSpec: CookieSpec = {
 *   domain: "example.com",
 *   name: "sessionId"
 * };
 *
 * // Using wildcards to match all cookies
 * const allCookies: CookieSpec = {
 *   domain: "example.com",
 *   name: "*"  // Match all cookies for example.com
 * };
 *
 * // Subdomain specification
 * const apiCookies: CookieSpec = {
 *   domain: "api.example.com",
 *   name: "auth"
 * };
 *
 * // Match cookies across all subdomains
 * const allSubdomainCookies: CookieSpec = {
 *   domain: ".example.com",  // Note the leading dot
 *   name: "tracking"
 * };
 *
 * // Multiple domain levels
 * const deepSubdomainCookie: CookieSpec = {
 *   domain: "dev.api.example.com",
 *   name: "debug"
 * };
 * ```
 */
export interface CookieSpec {
  /** The domain the cookie belongs to. */
  domain: string;
  /** The name of the cookie. */
  name: string;
}

/**
 * Type guard to check if an object matches the CookieSpec interface.
 * Used internally to validate cookie specifications before querying.
 * @param obj - The object to check.
 * @returns True if the object is a valid CookieSpec, false otherwise.
 * @example
 * ```typescript
 * import { isCookieSpec } from 'get-cookie';
 *
 * // Valid cookie specs
 * console.log(isCookieSpec({ domain: "example.com", name: "sessionId" })); // true
 * console.log(isCookieSpec({ domain: ".example.com", name: "*" })); // true
 *
 * // Invalid examples
 * console.log(isCookieSpec({ domain: 123, name: "test" })); // false - invalid domain type
 * console.log(isCookieSpec({ domain: "example.com" })); // false - missing name
 * console.log(isCookieSpec({ name: "test" })); // false - missing domain
 * console.log(isCookieSpec(null)); // false
 * console.log(isCookieSpec({})); // false - empty object
 * ```
 */
export function isCookieSpec(obj: unknown): obj is CookieSpec {
  const cookie = obj as CookieSpec;
  return typeof cookie.domain === "string" && typeof cookie.name === "string";
}

/**
 * Type representing either a single cookie specification or an array of specifications.
 * Useful when you need to query multiple cookies in a single operation.
 * @remarks
 * - Can be used to batch multiple cookie queries
 * - Supports mixing different domains and patterns
 * - Order of specifications doesn't affect results
 * @example
 * ```typescript
 * import { MultiCookieSpec } from 'get-cookie';
 *
 * // Single cookie spec
 * const single: MultiCookieSpec = {
 *   domain: "example.com",
 *   name: "sessionId"
 * };
 *
 * // Multiple cookie specs with different patterns
 * const multiple: MultiCookieSpec = [
 *   { domain: "example.com", name: "sessionId" },
 *   { domain: "api.example.com", name: "authToken" },
 *   { domain: ".example.com", name: "*" },  // All cookies on all subdomains
 *   { domain: "app.example.com", name: "theme" }
 * ];
 *
 * // Using with cookie query functions
 * const cookies = await getCookie(multiple); // Will fetch all specified cookies
 * ```
 */
export type MultiCookieSpec = CookieSpec | CookieSpec[];

/**
 * Type guard to check if an object matches the MultiCookieSpec type.
 * @param obj - The object to check.
 * @returns True if the object is a valid MultiCookieSpec, false otherwise.
 * @example
 * ```typescript
 * import { isMultiCookieSpec } from 'get-cookie';
 *
 * // Single spec check
 * const single = { domain: "example.com", name: "sessionId" };
 * console.log(isMultiCookieSpec(single)); // true
 *
 * // Array of specs check
 * const multiple = [
 *   { domain: "example.com", name: "sessionId" },
 *   { domain: "api.example.com", name: "authToken" }
 * ];
 * console.log(isMultiCookieSpec(multiple)); // true
 *
 * // Invalid examples
 * console.log(isMultiCookieSpec([{ domain: 123, name: "test" }])); // false
 * console.log(isMultiCookieSpec(null)); // false
 * console.log(isMultiCookieSpec([null])); // false
 * ```
 */
export function isMultiCookieSpec(obj: unknown): obj is MultiCookieSpec {
  if (isCookieSpec(obj)) {
    return true;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (!isCookieSpec(obj[i])) {
        return false;
      }
    }
    return true;
  }
  return false;
}
