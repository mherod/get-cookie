import { getEncryptedChromeCookie } from "../../getEncryptedChromeCookie";
import { decrypt } from "../decrypt";
import { setupChromeTest, mockCookieData } from "../testSetup";

jest.mock("../decrypt");
jest.mock("../../getEncryptedChromeCookie");

describe("ChromeCookieQueryStrategy - Basic Functionality", () => {
  const strategy = setupChromeTest();

  beforeEach(() => {
    jest.resetAllMocks();
    (decrypt as jest.Mock).mockResolvedValue("decrypted-value");
    (getEncryptedChromeCookie as jest.Mock).mockResolvedValue([mockCookieData]);
  });

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

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should handle decryption failures gracefully", async () => {
    (decrypt as jest.Mock).mockRejectedValue(new Error("Decryption failed"));
    (getEncryptedChromeCookie as jest.Mock).mockResolvedValue([mockCookieData]);

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
    (getEncryptedChromeCookie as jest.Mock).mockRejectedValue(
      new Error("Failed to get cookies"),
    );

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toEqual([]);
  });
});

describe("ChromeCookieQueryStrategy - Value Handling", () => {
  const strategy = setupChromeTest();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should handle non-buffer cookie values", async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: "non-buffer-value",
    };
    (getEncryptedChromeCookie as jest.Mock).mockResolvedValue([
      nonBufferCookie,
    ]);
    (decrypt as jest.Mock).mockResolvedValue("decrypted-value");

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(decrypt).toHaveBeenCalledWith(expect.any(Buffer), "test-password");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("decrypted-value");
  });
});
