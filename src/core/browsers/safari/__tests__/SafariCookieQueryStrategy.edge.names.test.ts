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

describe("SafariCookieQueryStrategy - Cookie Name Edge Cases", () => {
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

  it("should handle empty cookie name", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("");
  });

  it("should handle special characters in cookie name", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "!@#$%^&*()",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("!@#$%^&*()", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("!@#$%^&*()");
  });

  it("should handle unicode characters in cookie name", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "🍪",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("🍪", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("🍪");
  });
});
