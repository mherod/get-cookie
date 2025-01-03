/**
 * Specification for identifying a cookie by its domain and name
 */
export interface CookieSpec {
  /** The domain the cookie belongs to */
  domain: string;
  /** The name of the cookie */
  name: string;
}

/**
 * Type guard to check if an object matches the CookieSpec interface
 * @param obj - The object to check
 * @returns True if the object is a valid CookieSpec, false otherwise
 */
export function isCookieSpec(obj: unknown): obj is CookieSpec {
  const cookie = obj as CookieSpec;
  return typeof cookie.domain === "string" && typeof cookie.name === "string";
}

/**
 * Type representing either a single cookie specification or an array of specifications
 */
export type MultiCookieSpec = CookieSpec | CookieSpec[];

/**
 * Type guard to check if an object matches the MultiCookieSpec type
 * @param obj - The object to check
 * @returns True if the object is a valid MultiCookieSpec, false otherwise
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
