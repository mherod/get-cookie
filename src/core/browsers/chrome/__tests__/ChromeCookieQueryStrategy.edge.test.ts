import {
  mockCookieData,
  mockDecrypt,
  mockGetEncryptedChromeCookie,
  setupChromeTest,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Edge Cases", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  it("should handle non-buffer cookie values", async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: "non-buffer-value",
    };
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([nonBufferCookie]);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(mockDecrypt).toHaveBeenCalledWith(
      expect.any(Buffer),
      "test-password",
    );
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("decrypted-value");
  });
});
