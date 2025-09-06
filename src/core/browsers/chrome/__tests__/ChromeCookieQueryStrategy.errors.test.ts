import {
  mockCookieData,
  mockDecrypt,
  mockGetGlobalQueryMonitor,
  setupChromeTest,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Error Handling", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  it("should handle decryption failures gracefully", async () => {
    mockDecrypt.mockRejectedValueOnce(new Error("Decryption failed"));

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      domain: mockCookieData.domain,
      meta: {
        browser: "Chrome",
        decrypted: false,
      },
    });
  });

  it("should handle cookie retrieval errors gracefully", async () => {
    // Mock the query monitor to throw an error
    const mockMonitor = mockGetGlobalQueryMonitor();
    mockMonitor.executeQuery.mockImplementationOnce(() => {
      throw new Error("Failed to get cookies");
    });

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toEqual([]);
  });
});
