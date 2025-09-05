import { homedir } from "node:os";

import type { BinaryCookieRow } from "../../../../types/schemas";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";
import { decodeBinaryCookies } from "../decodeBinaryCookies";

// Mock decodeBinaryCookies
jest.mock("../decodeBinaryCookies");

// Mock SystemPermissions utilities
jest.mock("@utils/SystemPermissions", () => ({
  checkFilePermission: jest.fn().mockResolvedValue(true),
  handleSafariPermissionError: jest.fn().mockResolvedValue(false),
}));
// Mock os.homedir and path.join
jest.mock("node:os", () => ({
  homedir: jest.fn().mockReturnValue("/Users/testuser"),
  platform: jest.fn().mockReturnValue("darwin"),
}));
jest.mock("node:path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

describe("SafariCookieQueryStrategy - Path Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const _mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
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
