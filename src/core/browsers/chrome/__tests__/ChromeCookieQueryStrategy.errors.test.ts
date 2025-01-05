import {
  mockGetEncryptedChromeCookie,
  mockDecrypt,
  setupChromeTest,
  mockCookieData,
  mockCookieFile,
  restorePlatform,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Error Handling", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = setupChromeTest();
  });

  afterEach(() => {
    restorePlatform();
  });

  it("should handle decryption failures gracefully", async () => {
    mockGetEncryptedChromeCookie.mockResolvedValue([mockCookieData]);
    mockDecrypt.mockRejectedValue(new Error("Decryption failed"));

    const cookies = await strategy.queryCookies(
      "test-cookie",
      "example.com",
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      domain: mockCookieData.domain,
      value: mockCookieData.value.toString("utf-8"),
      meta: {
        decrypted: false,
      },
    });
  });

  it("should handle cookie retrieval errors gracefully", async () => {
    mockGetEncryptedChromeCookie.mockRejectedValueOnce(
      new Error("Failed to retrieve cookies"),
    );

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toHaveLength(0);
  });
});
