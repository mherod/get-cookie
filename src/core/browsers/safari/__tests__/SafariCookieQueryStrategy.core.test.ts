import { homedir } from "os";

import type { BinaryCookieRow } from "../../../../types/schemas";
import { decodeBinaryCookies } from "../decodeBinaryCookies";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";

// Mock decodeBinaryCookies
jest.mock("../decodeBinaryCookies");

// Mock os.homedir and path.join
jest.mock("os", () => ({
  homedir: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

describe("SafariCookieQueryStrategy - Basic", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should return 'Safari' as the browser name", () => {
    expect(strategy.browserName).toBe("Safari");
  });

  it("should return empty array when HOME is not set", async () => {
    mockHomedir.mockReturnValue("");
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });

  it("should successfully decode and filter cookies", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: "test-cookie",
      value: "test-value",
      domain: "example.com",
    });
  });

  it("should handle empty cookie array from decodeBinaryCookies", async () => {
    mockDecodeBinaryCookies.mockReturnValue([]);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Edge Cases", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle non-string homedir return value", async () => {
    mockHomedir.mockReturnValue(undefined as unknown as string);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });

  it("should handle null homedir return value", async () => {
    mockHomedir.mockReturnValue(null as unknown as string);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });

  it("should include correct meta information in cookies", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].meta).toEqual({
      file: "/Users/testuser/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
      browser: "Safari",
      decrypted: false,
      secure: false,
      httpOnly: false,
      path: "/",
      version: undefined,
      comment: undefined,
      commentURL: undefined,
      port: undefined,
      creation: 1234567890 * 1000,
    });
  });
});
