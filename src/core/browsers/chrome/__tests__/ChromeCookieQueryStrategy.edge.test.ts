import {
  mockGetEncryptedChromeCookie,
  mockDecrypt,
  setupChromeTest,
  mockCookieData,
  mockPassword,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Edge Cases", () => {
  let strategy: ReturnType<typeof setupChromeTest>;
  const originalPlatform = process.platform;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  afterAll(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  it("should handle non-buffer cookie values", async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: "non-buffer-value",
    };
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([nonBufferCookie]);
    mockDecrypt.mockResolvedValueOnce("decrypted-value");

    const cookies = await strategy.queryCookies(
      "test-cookie",
      "example.com",
      "test-password",
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("decrypted-value");
    expect(mockDecrypt).toHaveBeenCalledWith(expect.any(Buffer), mockPassword);
  });
});
