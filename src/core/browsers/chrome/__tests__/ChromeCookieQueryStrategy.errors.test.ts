import {
  mockGetEncryptedChromeCookie,
  mockDecrypt,
  setupChromeTest,
  mockCookieData,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Error Handling", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  it("should handle decryption failures gracefully", async () => {
    mockDecrypt.mockRejectedValueOnce(new Error("Decryption failed"));
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([mockCookieData]);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      domain: mockCookieData.domain,
      value: mockCookieData.value.toString("utf-8"),
      meta: {
        browser: "Chrome",
        decrypted: false,
      },
    });
  });

  it("should handle cookie retrieval errors gracefully", async () => {
    mockGetEncryptedChromeCookie.mockRejectedValueOnce(
      new Error("Failed to get cookies"),
    );

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toEqual([]);
  });
});
