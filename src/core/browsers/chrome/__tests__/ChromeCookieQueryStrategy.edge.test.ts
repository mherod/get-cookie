import {
  mockCookieData,
  mockCookieFile,
  mockGetEncryptedChromeCookie,
  setupChromeTest,
} from "../testSetup";
import type { ChromeCookieRow } from "../types";

describe("ChromeCookieQueryStrategy - Basic Edge Cases", () => {
  it("should handle empty cookie values", async () => {
    const strategy = setupChromeTest();
    const emptyCookie: ChromeCookieRow = {
      ...mockCookieData,
      value: "",
      encrypted_value: Buffer.from(""),
    };

    mockGetEncryptedChromeCookie.mockResolvedValueOnce([emptyCookie]);

    const cookies = await strategy.queryCookies(
      emptyCookie.name,
      emptyCookie.host_key,
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("");
  });

  it("should handle malformed cookie data", async () => {
    const strategy = setupChromeTest();
    const malformedCookie = {
      ...mockCookieData,
      value: undefined,
      encrypted_value: null,
    } as unknown as ChromeCookieRow;

    mockGetEncryptedChromeCookie.mockResolvedValueOnce([malformedCookie]);

    const cookies = await strategy.queryCookies(
      malformedCookie.name,
      malformedCookie.host_key,
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("");
  });

  it("should handle expired cookies", async () => {
    const strategy = setupChromeTest();
    const expiredCookie: ChromeCookieRow = {
      ...mockCookieData,
      expires_utc: 0, // Expired timestamp
    };

    mockGetEncryptedChromeCookie.mockResolvedValueOnce([expiredCookie]);

    const cookies = await strategy.queryCookies(
      expiredCookie.name,
      expiredCookie.host_key,
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toEqual(new Date(0));
  });
});

describe("ChromeCookieQueryStrategy - Advanced Edge Cases", () => {
  it("should handle special characters in cookie names and domains", async () => {
    const strategy = setupChromeTest();
    const specialCharCookie: ChromeCookieRow = {
      ...mockCookieData,
      name: "test!@#$%^&*()_+",
      host_key: "example!@#$%^&*()_+.com",
    };

    mockGetEncryptedChromeCookie.mockResolvedValueOnce([specialCharCookie]);

    const cookies = await strategy.queryCookies(
      specialCharCookie.name,
      specialCharCookie.host_key,
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe(specialCharCookie.name);
    expect(cookies[0].domain).toBe(specialCharCookie.host_key);
  });

  it("should handle very large cookie values", async () => {
    const strategy = setupChromeTest();
    const largeValue = Buffer.alloc(1024 * 1024); // 1MB buffer
    const largeCookie: ChromeCookieRow = {
      ...mockCookieData,
      value: largeValue,
      encrypted_value: largeValue,
    };

    mockGetEncryptedChromeCookie.mockResolvedValueOnce([largeCookie]);

    const cookies = await strategy.queryCookies(
      largeCookie.name,
      largeCookie.host_key,
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(typeof cookies[0].value).toBe("string");
    expect((cookies[0].value as string).length).toBeGreaterThan(0);
  });
});
