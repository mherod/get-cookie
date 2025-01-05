import {
  mockGetEncryptedChromeCookie,
  mockDecrypt,
  setupChromeTest,
  mockCookieData,
  mockPassword,
} from "../testSetup";

jest.mock("../../getEncryptedChromeCookie");
jest.mock("../decrypt");

describe("ChromeCookieQueryStrategy - Basic Functionality", () => {
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

  it("should query and decrypt cookies successfully", async () => {
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([mockCookieData]);
    mockDecrypt.mockResolvedValueOnce("decrypted-value");

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      value: "decrypted-value",
      domain: mockCookieData.domain,
      meta: {
        browser: "Chrome",
        decrypted: true,
      },
    });
    expect(mockDecrypt).toHaveBeenCalledWith(
      mockCookieData.value,
      mockPassword,
    );
  });

  it("should handle decryption failures gracefully", async () => {
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([mockCookieData]);
    mockDecrypt.mockRejectedValueOnce(new Error("Decryption failed"));

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      value: mockCookieData.value.toString("utf-8"),
      domain: mockCookieData.domain,
      meta: {
        browser: "Chrome",
        decrypted: false,
      },
    });
  });

  it("should handle non-buffer cookie values", async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: "non-buffer-value",
    };
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([nonBufferCookie]);
    mockDecrypt.mockResolvedValueOnce("decrypted-value");

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(mockDecrypt).toHaveBeenCalledWith(expect.any(Buffer), mockPassword);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("decrypted-value");
  });
});

describe("ChromeCookieQueryStrategy - Error Handling", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
    mockGetEncryptedChromeCookie.mockClear();
    mockDecrypt.mockClear();
  });

  it("should handle decryption failures gracefully", async () => {
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([mockCookieData]);
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
    mockGetEncryptedChromeCookie.mockRejectedValueOnce(
      new Error("Failed to get cookies"),
    );

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toEqual([]);
  });
});

describe("ChromeCookieQueryStrategy - Value Handling", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
    mockGetEncryptedChromeCookie.mockClear();
    mockDecrypt.mockClear();
  });

  it("should handle non-buffer cookie values", async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: "non-buffer-value",
    };
    mockGetEncryptedChromeCookie.mockResolvedValueOnce([nonBufferCookie]);
    mockDecrypt.mockResolvedValueOnce("decrypted-value");

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(mockDecrypt).toHaveBeenCalledWith(expect.any(Buffer), mockPassword);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("decrypted-value");
  });
});
