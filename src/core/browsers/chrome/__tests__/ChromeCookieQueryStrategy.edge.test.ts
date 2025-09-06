import {
  mockCookieData,
  mockDecrypt,
  mockGetGlobalQueryMonitor,
  setupChromeTest,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Edge Cases", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  it("should handle non-buffer cookie values", async () => {
    // Override the mock to return non-buffer value
    const mockMonitor = mockGetGlobalQueryMonitor();
    mockMonitor.executeQuery.mockReturnValueOnce([
      {
        encrypted_value: "non-buffer-value",
        name: mockCookieData.name,
        host_key: mockCookieData.domain,
        expires_utc: mockCookieData.expiry,
      },
    ]);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(mockDecrypt).toHaveBeenCalledWith(
      expect.any(Buffer),
      "test-password",
      0,
    );
    expect(cookies).toHaveLength(1);
    expect(cookies[0]!.value).toBe("decrypted-value");
  });
});
