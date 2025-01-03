import type { CookieQueryStrategy } from "../../../types/CookieQueryStrategy";
import type { ExportedCookie } from "../../../types/ExportedCookie";

/**
 * A mock implementation of CookieQueryStrategy for testing
 */
export default class MockCookieQueryStrategy implements CookieQueryStrategy {
  public readonly browserName: string = "mock";
  private readonly mockCookies: ExportedCookie[];

  /**
   * Creates a new instance of MockCookieQueryStrategy
   * @param mockCookies - Array of cookies to use as mock data
   */
  public constructor(mockCookies: ExportedCookie[] = []) {
    this.mockCookies = mockCookies;
  }

  /**
   * Queries cookies matching the given name and domain
   * @param name - The name of the cookie to query, or "*" for all names
   * @param domain - The domain of the cookie to query, or "*" for all domains
   * @returns Promise resolving to array of matching cookies
   */
  public async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    return Promise.resolve(
      this.mockCookies.filter(cookie =>
        (name === "*" || cookie.name === name) &&
        (domain === "*" || cookie.domain === domain)
      )
    );
  }

  /**
   * Returns all mock cookies
   * @returns Promise resolving to array of all mock cookies
   */
  public async queryAllCookies(): Promise<ExportedCookie[]> {
    return Promise.resolve(this.mockCookies);
  }
}
