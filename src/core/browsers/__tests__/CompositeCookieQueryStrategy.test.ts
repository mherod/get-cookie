import type {
  BrowserName,
  CookieQueryStrategy,
  ExportedCookie,
} from "../../../types/schemas";
import { CompositeCookieQueryStrategy } from "../CompositeCookieQueryStrategy";

class MockCookieQueryStrategy implements CookieQueryStrategy {
  public constructor(
    public readonly browserName: BrowserName,
    private readonly mockCookies: ExportedCookie[] = [],
  ) {}

  public async queryCookies(): Promise<ExportedCookie[]> {
    return Promise.resolve(this.mockCookies);
  }
}

describe("CompositeCookieQueryStrategy", () => {
  it("should combine results from multiple strategies", async () => {
    const chromeCookies: ExportedCookie[] = [
      {
        name: "test-cookie",
        value: "chrome-value",
        domain: "example.com",
        expiry: "Infinity",
        meta: {
          browser: "Chrome",
          decrypted: true,
          file: "/path/to/chrome/cookies",
        },
      },
    ];

    const firefoxCookies: ExportedCookie[] = [
      {
        name: "test-cookie",
        value: "firefox-value",
        domain: "example.com",
        expiry: new Date(Date.now() + 3600000),
        meta: {
          browser: "Firefox",
          decrypted: false,
          file: "/path/to/firefox/cookies",
        },
      },
    ];

    const chromeStrategy = new MockCookieQueryStrategy("Chrome", chromeCookies);
    const firefoxStrategy = new MockCookieQueryStrategy(
      "Firefox",
      firefoxCookies,
    );

    const composite = new CompositeCookieQueryStrategy([
      chromeStrategy,
      firefoxStrategy,
    ]);
    const cookies = await composite.queryCookies("test-cookie", "example.com");

    expect(cookies).toHaveLength(2);
    expect(cookies).toEqual(
      expect.arrayContaining([...chromeCookies, ...firefoxCookies]),
    );
  });

  it("should handle empty results from strategies", async () => {
    const chromeStrategy = new MockCookieQueryStrategy("Chrome", []);
    const firefoxStrategy = new MockCookieQueryStrategy("Firefox", []);

    const composite = new CompositeCookieQueryStrategy([
      chromeStrategy,
      firefoxStrategy,
    ]);
    const cookies = await composite.queryCookies("test-cookie", "example.com");

    expect(cookies).toEqual([]);
  });

  it("should handle errors from individual strategies", async () => {
    const workingStrategy = new MockCookieQueryStrategy("Chrome", [
      {
        name: "test-cookie",
        value: "chrome-value",
        domain: "example.com",
        expiry: "Infinity",
        meta: {
          browser: "Chrome",
          decrypted: true,
          file: "/path/to/chrome/cookies",
        },
      },
    ]);

    const failingStrategy: CookieQueryStrategy = {
      browserName: "Firefox",
      queryCookies: jest.fn().mockRejectedValue(new Error("Failed to query")),
    };

    const composite = new CompositeCookieQueryStrategy([
      workingStrategy,
      failingStrategy,
    ]);
    const cookies = await composite.queryCookies("test-cookie", "example.com");

    // Should still return results from working strategy
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toBeDefined();
    expect(cookies[0]).toMatchObject({
      meta: {
        browser: "Chrome",
      },
    });
  });

  it("should handle empty strategy list", async () => {
    const composite = new CompositeCookieQueryStrategy([]);
    const cookies = await composite.queryCookies("test-cookie", "example.com");

    expect(cookies).toEqual([]);
  });
});
