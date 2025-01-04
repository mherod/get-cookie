import { BinaryCookieRow } from "../../../../types/schemas";
import * as BinaryCookies from "../decodeBinaryCookies";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";

// Mock the decodeBinaryCookies function
jest.mock("../decodeBinaryCookies");

const mockDecodeBinaryCookies = jest.spyOn(
  BinaryCookies,
  "decodeBinaryCookies"
) as jest.MockedFunction<typeof BinaryCookies.decodeBinaryCookies>;

function createMockCookie(
  name: string,
  value: string,
  domain: string,
  expiry: number = Math.floor(Date.now() / 1000) + 3600,
): BinaryCookieRow {
  return {
    name,
    value,
    domain,
    path: "/",
    expiry,
    creation: Math.floor(Date.now() / 1000),
  };
}

describe("SafariCookieQueryStrategy", () => {
  let strategy: SafariCookieQueryStrategy;
  const originalHome = process.env.HOME;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    process.env.HOME = "/mock/home";
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  describe("Basic Functionality", () => {
    it('should return "Safari" as the browser name', () => {
      expect(strategy.browserName).toBe("Safari");
    });

    it("should return empty array when HOME is not set", async () => {
      process.env.HOME = "";
      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toEqual([]);
    });

    it("should successfully decode and filter cookies", async () => {
      const mockCookies = [
        createMockCookie("test-cookie", "test-value", "example.com"),
        createMockCookie("other-cookie", "other-value", "other.com"),
      ];

      mockDecodeBinaryCookies.mockReturnValue(mockCookies);

      const cookies = await strategy.queryCookies("test-cookie", "example.com");

      expect(cookies).toHaveLength(1);
      expect(cookies[0]).toMatchObject({
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        meta: {
          browser: "Safari",
          decrypted: false,
          file: expect.stringMatching(/Cookies\.binarycookies$/) as string,
        },
      });
    });

    it("should handle cookies with leading dot in domain", async () => {
      const mockCookies = [
        createMockCookie("test-cookie", "test-value", ".example.com"),
      ];

      mockDecodeBinaryCookies.mockReturnValue(mockCookies);

      const cookies = await strategy.queryCookies("test-cookie", "example.com");

      expect(cookies).toHaveLength(1);
      expect(cookies[0].domain).toBe(".example.com");
    });
  });

  describe("Error Handling", () => {
    it("should handle decoding errors gracefully", async () => {
      mockDecodeBinaryCookies.mockImplementation(() => {
        throw new Error("Failed to decode");
      });

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toEqual([]);
    });

    it("should handle cookies with invalid expiry", async () => {
      const mockCookies = [
        createMockCookie("test-cookie", "test-value", "example.com", -1),
      ];

      mockDecodeBinaryCookies.mockReturnValue(mockCookies);

      const cookies = await strategy.queryCookies("test-cookie", "example.com");

      expect(cookies).toHaveLength(1);
      expect(cookies[0].expiry).toBe("Infinity");
    });

    it("should handle missing cookie file", async () => {
      mockDecodeBinaryCookies.mockImplementation(() => {
        const error = new Error("ENOENT: no such file or directory");
        (error as NodeJS.ErrnoException).code = "ENOENT";
        throw error;
      });

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toEqual([]);
    });
  });
});
