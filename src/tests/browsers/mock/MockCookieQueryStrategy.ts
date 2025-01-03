import type { BrowserName } from "../../../types/BrowserName";
import type { CookieQueryStrategy } from "../../../types/CookieQueryStrategy";
import type { ExportedCookie } from "../../../types/ExportedCookie";

/**
 * Mock implementation of CookieQueryStrategy for testing
 */
export default class MockCookieQueryStrategy implements CookieQueryStrategy {
  public readonly browserName: BrowserName = "unknown";

  /**
   * Creates a new instance of MockCookieQueryStrategy
   * @param mockCookies - Array of mock cookies to use for testing
   */
  public constructor(private mockCookies: ExportedCookie[]) {}

  /**
   * Queries mock cookies based on name and domain patterns
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @returns A promise that resolves to an array of matching cookies
   */
  public async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    return Promise.resolve(
      this.mockCookies.filter(
        cookie => cookie.name.includes(name) && cookie.domain.includes(domain)
      )
    );
  }
}
