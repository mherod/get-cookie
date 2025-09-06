import type { BinaryCookieRow } from "../../../../types/schemas";
import { decodeBinaryCookies } from "../decodeBinaryCookies";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";

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

describe("SafariCookieQueryStrategy - Error Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
    jest.clearAllMocks();
  });

  describe("Decoding Errors", () => {
    it("should handle Error objects in catch block", async () => {
      mockDecodeBinaryCookies.mockImplementation(() => {
        throw new Error("Failed to decode cookies");
      });

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toEqual([]);
    });

    it("should handle non-Error objects in catch block", async () => {
      mockDecodeBinaryCookies.mockImplementation(() => {
        throw new Error("Not a string error");
      });

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toEqual([]);
    });

    it("should handle null error in catch block", async () => {
      mockDecodeBinaryCookies.mockImplementation(() => {
        throw new Error();
      });

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toEqual([]);
    });
  });

  describe("Invalid Cookie Data", () => {
    it("should handle invalid cookie values", async () => {
      const mockCookies: BinaryCookieRow[] = [
        {
          name: "test-cookie",
          value: {} as unknown as string,
          domain: "example.com",
          path: "/",
          creation: 1234567890,
          expiry: 1234567890,
        },
      ];

      mockDecodeBinaryCookies.mockReturnValue(mockCookies);

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toHaveLength(1);
      expect(cookies[0]!.value).toBe("{}");
    });

    it("should handle null cookie values", async () => {
      const mockCookies: BinaryCookieRow[] = [
        {
          name: "test-cookie",
          value: null as unknown as string,
          domain: "example.com",
          path: "/",
          creation: 1234567890,
          expiry: 1234567890,
        },
      ];

      mockDecodeBinaryCookies.mockReturnValue(mockCookies);

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toHaveLength(1);
      expect(cookies[0]!.value).toBe("null");
    });
  });
});
