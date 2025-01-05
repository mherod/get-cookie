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
  private cookies: ExportedCookie[];

  /**
   * Creates a new instance of MockCookieQueryStrategy
   * @param cookies - Array of mock cookies to use for testing
   */
  public constructor(cookies: ExportedCookie[]) {
    this.cookies = cookies;
  }

  /**
   * The browser name for this strategy
   * @returns The browser name
   */
  public get browserName(): BrowserName {
    return "internal";
  }

  /**
   * Queries mock cookies based on name and domain patterns
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional store pattern to match cookies against
   * @returns A promise that resolves to an array of matching cookies
   */
  public async queryCookies(
    name: string,
    domain: string,
    store?: string,
  ): Promise<ExportedCookie[]> {
    return Promise.resolve(
      this.cookies.filter(
        (cookie) =>
          cookie.name === name &&
          cookie.domain === domain &&
          (store === undefined || cookie.meta?.filePath === store),
      ),
    );
  }
}
