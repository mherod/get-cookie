import type {
  BrowserName,
  CookieQueryStrategy,
  ExportedCookie,
} from "../../../types/schemas";

/**
 * Mock implementation of CookieQueryStrategy for testing
 * @example
 * ```typescript
 * const mockCookies = [
 *   {
 *     name: 'session',
 *     domain: 'example.com',
 *     value: 'abc123'
 *   }
 * ];
 * const strategy = new MockCookieQueryStrategy(mockCookies);
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export default class MockCookieQueryStrategy implements CookieQueryStrategy {
  /**
   * The browser name for this strategy
   */
  public readonly browserName: BrowserName = "unknown";

  /**
   * Creates a new instance of MockCookieQueryStrategy
   * @param mockCookies - Array of mock cookies to use for testing
   * @example
   * ```typescript
   * const mockCookies = [
   *   {
   *     name: 'session',
   *     domain: 'example.com',
   *     value: 'abc123'
   *   }
   * ];
   * const strategy = new MockCookieQueryStrategy(mockCookies);
   * ```
   */
  public constructor(private mockCookies: ExportedCookie[]) {}

  /**
   * Queries mock cookies based on name and domain patterns
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @returns A promise that resolves to an array of matching cookies
   * @example
   * ```typescript
   * const strategy = new MockCookieQueryStrategy([
   *   {
   *     name: 'session',
   *     domain: 'example.com',
   *     value: 'abc123'
   *   }
   * ]);
   * const cookies = await strategy.queryCookies('session', 'example.com');
   * console.log(cookies); // [{ name: 'session', domain: 'example.com', value: 'abc123' }]
   * ```
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    return Promise.resolve(
      this.mockCookies.filter(
        (cookie) =>
          cookie.name.includes(name) && cookie.domain.includes(domain),
      ),
    );
  }
}
