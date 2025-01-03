/**
 * Specification for a cookie to query
 * @example
 */
export interface CookieSpec {
  /** The name of the cookie to query */
  name: string;
  /** The domain to query the cookie from */
  domain: string;
}

/**
 * Array of cookie specifications to query
 * @example
 */
export type MultiCookieSpec = CookieSpec[];
