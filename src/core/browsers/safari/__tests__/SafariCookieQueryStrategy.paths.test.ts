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

describe("SafariCookieQueryStrategy - Path Handling", () => {
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

  describe("Cookie File Path", () => {
    it("should use default cookie path when no store provided", async () => {
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

      await strategy.queryCookies("test-cookie", "example.com");
      expect(mockDecodeBinaryCookies).toHaveBeenCalledWith(
        "/Users/testuser/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
      );
    });

    it("should use custom store path when provided", async () => {
      const customPath = "/custom/path/to/Cookies.binarycookies";
      await strategy.queryCookies("test-cookie", "example.com", customPath);
      expect(mockDecodeBinaryCookies).toHaveBeenCalledWith(customPath);
    });
  });

  describe("Cookie Path Property", () => {
    it("should handle undefined cookie path", async () => {
      const mockCookies: BinaryCookieRow[] = [
        {
          name: "test-cookie",
          value: "test-value",
          domain: "example.com",
          path: undefined as unknown as string,
          creation: 1234567890,
          expiry: 1234567890,
        },
      ];

      mockDecodeBinaryCookies.mockReturnValue(mockCookies);

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toHaveLength(1);
      expect(cookies[0].meta?.path).toBeUndefined();
    });

    it("should include cookie path in meta", async () => {
      const mockCookies: BinaryCookieRow[] = [
        {
          name: "test-cookie",
          value: "test-value",
          domain: "example.com",
          path: "/custom/path",
          creation: 1234567890,
          expiry: 1234567890,
        },
      ];

      mockDecodeBinaryCookies.mockReturnValue(mockCookies);

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toHaveLength(1);
      expect(cookies[0].meta?.path).toBe("/custom/path");
    });
  });
});