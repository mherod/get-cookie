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
  public constructor(private readonly mockCookies: ExportedCookie[]) {}

  /**
   * Queries mock cookies based on name and domain patterns
   * @param name - The name pattern to match cookies against (supports "*" or "%" for wildcard)
   * @param domain - The domain pattern to match cookies against (supports "*" or "%" for wildcard)
   * @returns A promise that resolves to an array of matching cookies
   * @remarks
   * - Supports both "*" and "%" as wildcard patterns for maximum compatibility
   * - Uses exact matching for non-wildcard patterns (consistent with real browser strategies)
   * - Includes type guards to ensure cookie properties are valid strings
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
   *
   * // Wildcard matching
   * const allCookies = await strategy.queryCookies('*', 'example.com');
   * const allCookiesAlt = await strategy.queryCookies('%', 'example.com');
   * ```
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    return Promise.resolve(
      this.mockCookies.filter((cookie: ExportedCookie) => {
        // Type guard: ensure cookie properties are valid strings
        if (
          typeof cookie.name !== "string" ||
          typeof cookie.domain !== "string"
        ) {
          return false;
        }

        // Support both "*" and "%" wildcards for compatibility
        const nameMatches =
          name === "*" || name === "%" || cookie.name === name;
        const domainMatches =
          domain === "*" || domain === "%" || cookie.domain === domain;

        return nameMatches && domainMatches;
      }),
    );
  }
}
