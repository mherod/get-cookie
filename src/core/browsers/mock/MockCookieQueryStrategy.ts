import type { CookieQueryStrategy } from "../../../types/CookieQueryStrategy";
import type { ExportedCookie } from "../../../types/ExportedCookie";

/**
 * A mock implementation of CookieQueryStrategy for testing purposes.
 * Provides a way to simulate cookie querying behavior without a real browser.
 *
 * @example
 * // Initialize with mock cookies
 * const mockCookies = [
 *   { name: 'session', domain: 'example.com', value: '123', path: '/' },
 *   { name: 'theme', domain: 'example.com', value: 'dark', path: '/' }
 * ];
 * const strategy = new MockCookieQueryStrategy(mockCookies);
 *
 * // Query specific cookie
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * // Returns: [{ name: 'session', domain: 'example.com', value: '123', path: '/' }]
 *
 * // Query all cookies for domain
 * const allCookies = await strategy.queryCookies('*', 'example.com');
 */
export default class MockCookieQueryStrategy implements CookieQueryStrategy {
  /**
   * Name identifier for the mock browser implementation
   *
   * @readonly
   * @internal
   */
  public readonly browserName: string = "mock";

  /**
   * Internal storage for mock cookie data
   *
   * @private
   * @internal
   */
  private readonly mockCookies: ExportedCookie[];

  /**
   * Creates a new instance of MockCookieQueryStrategy
   *
   * @param mockCookies - Array of cookies to use as mock data. Defaults to empty array if not provided.
   *
   * @example
   * // Initialize with single cookie
   * const strategy = new MockCookieQueryStrategy([
   *   { name: 'session', domain: 'example.com', value: '123', path: '/' }
   * ]);
   *
   * // Initialize with multiple cookies
   * const strategy = new MockCookieQueryStrategy([
   *   { name: 'session', domain: 'example.com', value: '123', path: '/' },
   *   { name: 'theme', domain: 'app.example.com', value: 'dark', path: '/' }
   * ]);
   *
   * // Initialize with no cookies
   * const emptyStrategy = new MockCookieQueryStrategy();
   */
  public constructor(mockCookies: ExportedCookie[] = []) {
    this.mockCookies = mockCookies;
  }

  /**
   * Queries cookies matching the given name and domain
   *
   * @param name - The name of the cookie to query, or "*" for all names
   * @param domain - The domain of the cookie to query, or "*" for all domains
   * @returns Promise resolving to array of matching cookies
   *
   * @example
   * const strategy = new MockCookieQueryStrategy([
   *   { name: 'session', domain: 'example.com', value: '123' }
   * ]);
   *
   * // Query specific cookie
   * const cookies = await strategy.queryCookies('session', 'example.com');
   *
   * // Query all cookies for domain
   * const domainCookies = await strategy.queryCookies('*', 'example.com');
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    return Promise.resolve(
      this.mockCookies.filter(
        (cookie) =>
          (name === "*" || cookie.name === name) &&
          (domain === "*" || cookie.domain === domain),
      ),
    );
  }

  /**
   * Returns all mock cookies
   *
   * @returns Promise resolving to array of all mock cookies
   *
   * @example
   * const strategy = new MockCookieQueryStrategy([
   *   { name: 'session', domain: 'example.com', value: '123' },
   *   { name: 'theme', domain: 'example.com', value: 'dark' }
   * ]);
   * const allCookies = await strategy.queryAllCookies();
   */
  public async queryAllCookies(): Promise<ExportedCookie[]> {
    return Promise.resolve(this.mockCookies);
  }
}
