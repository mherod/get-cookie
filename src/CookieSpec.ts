/**
 * Define the CookieSpec interface with domain and name properties
 */
export default interface CookieSpec {
  domain: string;
  name: string;
}

/**
 * Function to check if an object is of type CookieSpec
 * @param obj - The object to check
 * @returns True if the object is of type CookieSpec, otherwise false
 */
export function isCookieSpec(obj: unknown): obj is CookieSpec {
  const cookie = obj as CookieSpec;
  return typeof cookie.domain === "string" && typeof cookie.name === "string";
}

/**
 * Define a type that can be either a single CookieSpec or an array of CookieSpecs
 */
export type MultiCookieSpec = CookieSpec | CookieSpec[];

/**
 * Function to check if an object is of type MultiCookieSpec
 * @param obj - The object to check
 * @returns True if the object is of type MultiCookieSpec, otherwise false
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
