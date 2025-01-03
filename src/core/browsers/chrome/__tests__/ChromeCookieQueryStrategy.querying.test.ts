import * as getEncryptedChromeCookieModule from "../../getEncryptedChromeCookie";
import * as decryptModule from "../decrypt";
import { setupChromeTest, mockCookieData, mockPassword } from "../testSetup";

jest.mock("../../getEncryptedChromeCookie");
jest.mock("../decrypt");

describe("ChromeCookieQueryStrategy - Basic Functionality", () => {
  let strategy: ReturnType<typeof setupChromeTest>;
  let getEncryptedChromeCookieSpy: jest.SpyInstance;
  let decryptSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    strategy = setupChromeTest();
    getEncryptedChromeCookieSpy = jest.spyOn(
      getEncryptedChromeCookieModule,
      "getEncryptedChromeCookie",
    );
    decryptSpy = jest.spyOn(decryptModule, "decrypt");
  });

  it("should query and decrypt cookies successfully", async () => {
    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(getEncryptedChromeCookieSpy).toHaveBeenCalledWith({
      name: "test-cookie",
      domain: "example.com",
      file: "/path/to/Cookies",
    });
    expect(decryptSpy).toHaveBeenCalledWith(mockCookieData.value, mockPassword);

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
  let getEncryptedChromeCookieSpy: jest.SpyInstance;
  let decryptSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    strategy = setupChromeTest();
    getEncryptedChromeCookieSpy = jest.spyOn(
      getEncryptedChromeCookieModule,
      "getEncryptedChromeCookie",
    );
    decryptSpy = jest.spyOn(decryptModule, "decrypt");
  });

  it("should handle decryption failures gracefully", async () => {
    decryptSpy.mockRejectedValue(new Error("Decryption failed"));

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
    getEncryptedChromeCookieSpy.mockRejectedValue(
      new Error("Failed to get cookies"),
    );

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(cookies).toEqual([]);
  });
});

describe("ChromeCookieQueryStrategy - Value Handling", () => {
  let strategy: ReturnType<typeof setupChromeTest>;
  let getEncryptedChromeCookieSpy: jest.SpyInstance;
  let decryptSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    strategy = setupChromeTest();
    getEncryptedChromeCookieSpy = jest.spyOn(
      getEncryptedChromeCookieModule,
      "getEncryptedChromeCookie",
    );
    decryptSpy = jest.spyOn(decryptModule, "decrypt");
  });

  it("should handle non-buffer cookie values", async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: "non-buffer-value",
    };
    getEncryptedChromeCookieSpy.mockResolvedValue([nonBufferCookie]);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(decryptSpy).toHaveBeenCalledWith(expect.any(Buffer), mockPassword);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("decrypted-value");
  });
});
