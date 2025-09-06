import type {
  CookieQueryStrategy,
  ExportedCookie,
} from "../../../types/schemas";
import { CompositeCookieQueryStrategy } from "../CompositeCookieQueryStrategy";

const createMockStrategy = (
  browserType: "Chrome" | "Firefox" | "Safari" | "internal" | "unknown",
  cookies: ExportedCookie[],
): CookieQueryStrategy => ({
  browserName: browserType,
  queryCookies: async (
    _name: string,
    _domain: string,
  ): Promise<ExportedCookie[]> => Promise.resolve(cookies),
});

const createTestCookies = (browser: string): ExportedCookie[] => [
  {
    name: `${browser}_cookie1`,
    value: `${browser}_value1`,
    domain: "example.com",
    expiry: 1234567890,
    meta: {
      browser,
      decrypted: true,
      file: `/path/to/${browser}/cookies`,
    },
  },
  {
    name: `${browser}_cookie2`,
    value: `${browser}_value2`,
    domain: "example.org",
    expiry: 1234567890,
    meta: {
      browser,
      decrypted: true,
      file: `/path/to/${browser}/cookies`,
    },
  },
];

describe("CompositeCookieQueryStrategy", () => {
  it("should combine results from multiple strategies", async () => {
    const chromeCookies = createTestCookies("chrome");
    const firefoxCookies = createTestCookies("firefox");
    const safariCookies = createTestCookies("safari");

    const chromeStrategy = createMockStrategy("Chrome", chromeCookies);
    const firefoxStrategy = createMockStrategy("Firefox", firefoxCookies);
    const safariStrategy = createMockStrategy("Safari", safariCookies);

    const composite = new CompositeCookieQueryStrategy([
      chromeStrategy,
      firefoxStrategy,
      safariStrategy,
    ]);

    const results = await composite.queryCookies("test-cookie", "example.com");
    expect(results).toHaveLength(6);
    expect(results).toEqual(
      expect.arrayContaining([
        ...chromeCookies,
        ...firefoxCookies,
        ...safariCookies,
      ]),
    );
  });

  it("should handle empty results from strategies", async () => {
    const composite = new CompositeCookieQueryStrategy([
      createMockStrategy("Chrome", []),
      createMockStrategy("Firefox", []),
    ]);

    const results = await composite.queryCookies("test-cookie", "example.com");
    expect(results).toHaveLength(0);
  });

  it("should handle errors from individual strategies", async () => {
    const workingStrategy = createMockStrategy(
      "Chrome",
      createTestCookies("working"),
    );
    const failingStrategy: CookieQueryStrategy = {
      browserName: "Firefox",
      queryCookies: async (
        _name: string,
        _domain: string,
      ): Promise<ExportedCookie[]> => {
        return Promise.reject(new Error("Strategy failed"));
      },
    };

    const composite = new CompositeCookieQueryStrategy([
      workingStrategy,
      failingStrategy,
    ]);
    const results = await composite.queryCookies("test-cookie", "example.com");

    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining(createTestCookies("working")),
    );
  });

  it("should handle empty strategy list", async () => {
    const composite = new CompositeCookieQueryStrategy([]);
    const results = await composite.queryCookies("test-cookie", "example.com");
    expect(results).toHaveLength(0);
  });
});
