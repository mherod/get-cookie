import { getEncryptedChromeCookie } from "../../getEncryptedChromeCookie";
import { decrypt } from "../decrypt";
import { setupChromeTest, mockCookieData } from "../testSetup";

// Mock the logger
jest.mock("@utils/logger", () => ({
  __esModule: true,
  default: {
    withTag: () => ({
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe("ChromeCookieQueryStrategy - Basic Functionality", () => {
  const strategy = setupChromeTest();

  it("should query and decrypt cookies successfully", async () => {
    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(getEncryptedChromeCookie).toHaveBeenCalledWith({
      name: "test-cookie",
      domain: "example.com",
      file: "/path/to/Cookies",
    });
    expect(decrypt).toHaveBeenCalledWith(mockCookieData.value, "test-password");

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
  const strategy = setupChromeTest();

  it("should handle decryption failures gracefully", async () => {
    jest.mocked(decrypt).mockRejectedValue(new Error("Decryption failed"));

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
    jest
      .mocked(getEncryptedChromeCookie)
      .mockRejectedValue(new Error("Failed to get cookies"));

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toEqual([]);
  });
});

describe("ChromeCookieQueryStrategy - Value Handling", () => {
  const strategy = setupChromeTest();

  it("should handle non-buffer cookie values", async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: "non-buffer-value",
    };
    jest.mocked(getEncryptedChromeCookie).mockResolvedValue([nonBufferCookie]);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(decrypt).toHaveBeenCalledWith(expect.any(Buffer), "test-password");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("decrypted-value");
  });
});
