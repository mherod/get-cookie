/**
 * Specification for a cookie to query
 */
export interface CookieSpec {
  /** The name of the cookie to query */
  name: string;
  /** The domain to query the cookie from */
  domain: string;
}

/**
 * Array of cookie specifications to query
 */
export type MultiCookieSpec = CookieSpec[];
