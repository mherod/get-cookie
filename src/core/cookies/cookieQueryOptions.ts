import type { CookieQueryStrategy } from "../../types/CookieQueryStrategy";

/**
 * Options for querying cookies
 */
export interface CookieQueryOptions<T extends CookieQueryStrategy> {
  /** Strategy to use for querying cookies */
  strategy: T;
  /** Maximum number of cookies to return */
  limit?: number;
  /** Whether to remove expired cookies from the results */
  removeExpired?: boolean;
}
