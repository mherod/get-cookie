import {
  mockCookieData,
  mockDecrypt,
  mockGetGlobalConnectionManager,
  mockGetGlobalQueryMonitor,
  mockPassword,
  setupChromeTest,
} from "../testSetup";

jest.mock("../decrypt");

describe("ChromeCookieQueryStrategy - Basic Functionality", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  it("should query and decrypt cookies successfully", async () => {
    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    // Check that SQL utilities were called correctly
    expect(mockGetGlobalConnectionManager).toHaveBeenCalled();
    expect(mockGetGlobalQueryMonitor).toHaveBeenCalled();

    expect(mockDecrypt).toHaveBeenCalledWith(
      mockCookieData.value,
      mockPassword,
      0,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      value: "decrypted-value",
      domain: mockCookieData.domain,
      meta: {
        file: "/path/to/Cookies",
        browser: "Chrome",
        decrypted: true,
      },
    });
  });
});

describe("ChromeCookieQueryStrategy - Error Handling", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
    mockDecrypt.mockClear();
  });

  it("should handle decryption failures gracefully", async () => {
    mockDecrypt.mockRejectedValueOnce(new Error("Decryption failed"));

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      value: mockCookieData.value.toString("utf-8"),
      domain: mockCookieData.domain,
      meta: {
        file: "/path/to/Cookies",
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

describe("ChromeCookieQueryStrategy - Value Handling", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
    mockDecrypt.mockClear();
  });

  it("should handle non-buffer cookie values", async () => {
    // Override the mock to return non-buffer value
    const mockMonitor = mockGetGlobalQueryMonitor();
    mockMonitor.executeQuery.mockReturnValueOnce([
      {
        encrypted_value: "non-buffer-value",
        name: mockCookieData.name,
        domain: mockCookieData.domain,
        expiry: mockCookieData.expiry,
      },
    ]);
    mockDecrypt.mockResolvedValueOnce("decrypted-value");

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(mockDecrypt).toHaveBeenCalledWith(
      expect.any(Buffer),
      mockPassword,
      0,
    );
    expect(cookies).toHaveLength(1);
    expect(cookies[0]!.value).toBe("decrypted-value");
  });
});
