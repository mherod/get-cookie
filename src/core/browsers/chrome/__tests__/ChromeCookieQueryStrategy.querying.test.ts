import {
  mockCookieData,
  mockCookieFile,
  mockGetEncryptedChromeCookie,
  setupChromeTest,
} from "../testSetup";
import type { ChromeCookieRow } from "../types";

describe("ChromeCookieQueryStrategy - Querying", () => {
  const secondCookie: ChromeCookieRow = {
    name: "second-cookie",
    value: Buffer.from("second-value"),
    encrypted_value: Buffer.from("second-encrypted-value"),
    host_key: "example.org",
    path: "/",
    expires_utc: Date.now() + 86400000, // 1 day in the future
    is_secure: 0,
    is_httponly: 0,
    samesite: "",
  };

  it("should query cookies by name and domain", async () => {
    const strategy = setupChromeTest();
    const cookies = await strategy.queryCookies(
      mockCookieData.name,
      mockCookieData.host_key,
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe(mockCookieData.name);
    expect(cookies[0].domain).toBe(mockCookieData.host_key);
  });

  it("should handle multiple cookies", async () => {
    const strategy = setupChromeTest();
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([
      mockCookieData,
      secondCookie,
    ]);

    const cookies = await strategy.queryCookies(
      mockCookieData.name,
      mockCookieData.host_key,
      mockCookieFile,
    );

    expect(cookies).toHaveLength(2);
    expect(cookies[0].name).toBe(mockCookieData.name);
    expect(cookies[0].domain).toBe(mockCookieData.host_key);
    expect(cookies[1].name).toBe(secondCookie.name);
    expect(cookies[1].domain).toBe(secondCookie.host_key);
  });
});
