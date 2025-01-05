import {
  mockGetEncryptedChromeCookie,
  mockDecrypt,
  setupChromeTest,
  mockCookieData,
  mockCookieFile,
  restorePlatform,
} from "../testSetup";

describe("ChromeCookieQueryStrategy - Basic Functionality", () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = setupChromeTest();
  });

  afterEach(() => {
    restorePlatform();
  });

  it("should query and decrypt a single cookie successfully", async () => {
    mockGetEncryptedChromeCookie.mockResolvedValue([mockCookieData]);
    mockDecrypt.mockResolvedValue("decrypted-value");

    const cookies = await strategy.queryCookies(
      "test-cookie",
      "example.com",
      mockCookieFile,
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      value: "decrypted-value",
      domain: mockCookieData.domain,
      meta: {
        decrypted: true,
      },
    });
  });

  it("should query and decrypt multiple cookies successfully", async () => {
    const secondCookie = {
      ...mockCookieData,
      name: "second-cookie",
    };

    mockGetEncryptedChromeCookie.mockResolvedValue([
      mockCookieData,
      secondCookie,
    ]);
    mockDecrypt
      .mockResolvedValueOnce("first-decrypted-value")
      .mockResolvedValueOnce("second-decrypted-value");

    const cookies = await strategy.queryCookies(
      "test-cookie",
      "example.com",
      mockCookieFile,
    );

    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      value: "first-decrypted-value",
      domain: mockCookieData.domain,
      meta: {
        decrypted: true,
      },
    });
    expect(cookies[1]).toMatchObject({
      name: secondCookie.name,
      value: "second-decrypted-value",
      domain: secondCookie.domain,
      meta: {
        decrypted: true,
      },
    });
  });
});
