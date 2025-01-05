import { CookieRow } from "../../../../../types/schemas";
import { mockCookieData } from "../../testSetup";

/**
 * Test cookie fixtures
 */
export const testCookies: CookieRow[] = [
  {
    name: "test-cookie",
    value: Buffer.from("test-value"),
    domain: "example.com",
    expiry: Date.now() + 86400000, // 1 day in the future
  },
];

describe("Chrome Cookie Fixtures", () => {
  describe("mockCookieData", () => {
    it("should have valid mock cookie data structure", () => {
      expect(mockCookieData).toBeDefined();
      expect(typeof mockCookieData.name).toBe("string");
      expect(mockCookieData.name.length).toBeGreaterThan(0);
      expect(Buffer.isBuffer(mockCookieData.value)).toBe(true);
      expect(mockCookieData.value.length).toBeGreaterThan(0);
      expect(typeof mockCookieData.domain).toBe("string");
      expect(mockCookieData.domain.length).toBeGreaterThan(0);
      expect(typeof mockCookieData.expiry).toBe("number");
      expect(mockCookieData.expiry).toBeGreaterThan(Date.now());
    });
  });

  describe("testCookies", () => {
    it("should have valid test cookie fixtures", () => {
      expect(testCookies).toBeInstanceOf(Array);
      expect(testCookies.length).toBeGreaterThan(0);

      testCookies.forEach((cookie) => {
        // Type-safe validation of required fields
        expect(typeof cookie.name).toBe("string");
        expect(Buffer.isBuffer(cookie.value)).toBe(true);
        expect(typeof cookie.domain).toBe("string");
        expect(typeof cookie.expiry).toBe("number");

        // Additional validation
        expect(cookie.name.length).toBeGreaterThan(0);
        expect(cookie.value.length).toBeGreaterThan(0);
        expect(cookie.domain.length).toBeGreaterThan(0);
        expect(cookie.expiry).toBeGreaterThan(Date.now());
      });
    });
  });
});
