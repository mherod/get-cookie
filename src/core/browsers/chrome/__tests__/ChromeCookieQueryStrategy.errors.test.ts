import {
  mockCookieData,
  mockCookieFile,
  mockGetEncryptedChromeCookie,
  setupChromeTest,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Error Handling", () => {
  it("should handle cookie query errors", async () => {
    const strategy = setupChromeTest();
    mockGetEncryptedChromeCookie.mockRejectedValueOnce(
      new Error("Query failed"),
    );

    const cookies = await strategy.queryCookies(
      mockCookieData.name,
      mockCookieData.host_key,
      mockCookieFile,
    );

    expect(cookies).toHaveLength(0);
  });

  it("should handle cookie decryption errors", async () => {
    const strategy = setupChromeTest();
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([mockCookieData]);

    const cookies = await strategy.queryCookies(
      mockCookieData.name,
      mockCookieData.host_key,
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe(mockCookieData.name);
    expect(cookies[0].domain).toBe(mockCookieData.host_key);
  });
});
