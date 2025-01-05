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

describe("SafariCookieQueryStrategy - Error Handling", () => {
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
      expect(cookies[0].value).toBe("[object Object]");
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
      expect(cookies[0].value).toBe("null");
    });
  });
});
