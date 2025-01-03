/**
 * Specification for identifying a cookie by its domain and name
 *
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
 * // Using wildcards
 * const allCookies: CookieSpec = {
 *   domain: "example.com",
 *   name: "*"  // Match all cookies
 * };
 *
 * // Subdomain specification
 * const apiCookies: CookieSpec = {
 *   domain: "api.example.com",
 *   name: "auth"
 * };
 * ```
 */
export interface CookieSpec {
  /** The domain the cookie belongs to */
  domain: string;
  /** The name of the cookie */
  name: string;
}

/**
 * Type guard to check if an object matches the CookieSpec interface
 *
 * @param obj - The object to check
 * @returns True if the object is a valid CookieSpec, false otherwise
 *
 * @example
 * ```typescript
 * import { isCookieSpec } from 'get-cookie';
 *
 * // Valid cookie spec
 * const validSpec = { domain: "example.com", name: "sessionId" };
 * if (isCookieSpec(validSpec)) {
 *   console.log("Valid cookie spec:", validSpec.domain);
 * }
 *
 * // Invalid examples
 * console.log(isCookieSpec({ domain: 123, name: "test" })); // false
 * console.log(isCookieSpec({ domain: "example.com" })); // false
 * console.log(isCookieSpec(null)); // false
 * ```
 */
export function isCookieSpec(obj: unknown): obj is CookieSpec {
  const cookie = obj as CookieSpec;
  return typeof cookie.domain === "string" && typeof cookie.name === "string";
}

/**
 * Type representing either a single cookie specification or an array of specifications
 *
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
 * // Multiple cookie specs
 * const multiple: MultiCookieSpec = [
 *   { domain: "example.com", name: "sessionId" },
 *   { domain: "api.example.com", name: "authToken" },
 *   { domain: "app.example.com", name: "theme" }
 * ];
 *
 * // Using with cookie query functions
 * const cookies = await getCookie(multiple); // Will fetch all specified cookies
 * ```
 */
export type MultiCookieSpec = CookieSpec | CookieSpec[];

/**
 * Type guard to check if an object matches the MultiCookieSpec type
 *
 * @param obj - The object to check
 * @returns True if the object is a valid MultiCookieSpec, false otherwise
 *
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
