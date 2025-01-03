import {
  mockListChromeProfilePaths,
  mockGetChromePassword,
  mockGetEncryptedChromeCookie,
  mockDecrypt,
  setupChromeTest,
  mockCookieData,
  mockCookieFile,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Successful Querying", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  it("should query and decrypt cookies successfully", async () => {
    const cookies = await strategy.queryCookies("test-cookie", "example.com");

    expect(mockListChromeProfilePaths).toHaveBeenCalled();
    expect(mockGetChromePassword).toHaveBeenCalled();
    expect(mockGetEncryptedChromeCookie).toHaveBeenCalledWith({
      name: "test-cookie",
      domain: "example.com",
      file: mockCookieFile,
    });
    expect(mockDecrypt).toHaveBeenCalledWith(
      mockCookieData.value,
      "test-password",
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      value: "decrypted-value",
      domain: mockCookieData.domain,
      meta: {
        file: mockCookieFile,
        browser: "Chrome",
        decrypted: true,
      },
    });
  });
});
