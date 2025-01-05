import {
  mockGetEncryptedChromeCookie,
  mockDecrypt,
  setupChromeTest,
  mockCookieData,
  mockPassword,
  mockCookieFile,
  restorePlatform,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Edge Cases", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = setupChromeTest();
  });

  afterEach(() => {
    restorePlatform();
  });

  it("should handle non-buffer cookie values", async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: "non-buffer-value",
    };
    mockGetEncryptedChromeCookie.mockResolvedValue([nonBufferCookie]);
    mockDecrypt.mockResolvedValue("decrypted-value");

    const cookies = await strategy.queryCookies(
      "test-cookie",
      "example.com",
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("decrypted-value");
    expect(mockDecrypt).toHaveBeenCalledWith(expect.any(Buffer), mockPassword);
  });
});
