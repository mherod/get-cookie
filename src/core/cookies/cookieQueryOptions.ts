import type { CookieQueryStrategy } from "../../types/schemas";

/**
 * Options for querying cookies.
 * @example
 * // Basic usage with 'all' strategy
 * const allCookiesOptions: CookieQueryOptions<'all'> = {
 *   strategy: 'all',
 *   limit: 10,
 *   removeExpired: true
 * };
 * @example
 * // Query with 'name' strategy
 * const nameQueryOptions: CookieQueryOptions<'name'> = {
 *   strategy: 'name',
 *   removeExpired: false
 * };
 * @example
 * // Query with pagination
 * const paginatedOptions: CookieQueryOptions<'all'> = {
 *   strategy: 'all',
 *   limit: 5,  // Only return 5 cookies
 *   removeExpired: true
 * };
 * @example
 * // Create options for Chrome cookie query
 * const chromeOptions: CookieQueryOptions<ChromeCookieQueryStrategy> = {
 *   strategy: new ChromeCookieQueryStrategy(),
 *   limit: 10,
 *   removeExpired: true
 * };
 * @example
 * // Create options for Firefox cookie query
 * const firefoxOptions: CookieQueryOptions<FirefoxCookieQueryStrategy> = {
 *   strategy: new FirefoxCookieQueryStrategy(),
 *   profiles: ['default', 'dev'],
 *   removeExpired: true
 * };
 * @example
 * // Create options for composite query
 * const compositeOptions: CookieQueryOptions<CompositeCookieQueryStrategy> = {
 *   strategy: new CompositeCookieQueryStrategy([
 *     new ChromeCookieQueryStrategy(),
 *     new FirefoxCookieQueryStrategy()
 *   ]),
 *   limit: 20
 * };
 */
export interface CookieQueryOptions<T extends CookieQueryStrategy> {
  /** Strategy to use for querying cookies */
  strategy: T;
  /** Maximum number of cookies to return */
  limit?: number;
  /** Whether to remove expired cookies from the results */
  removeExpired?: boolean;
}
