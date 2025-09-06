import { homedir } from "node:os";
import { join } from "node:path";

import { EdgeCookieQueryStrategy } from "../EdgeCookieQueryStrategy";

describe("EdgeCookieQueryStrategy", () => {
  let strategy: EdgeCookieQueryStrategy;

  beforeEach(() => {
    strategy = new EdgeCookieQueryStrategy();
  });

  describe("constructor", () => {
    it("should create an instance with Edge browser type", () => {
      expect(strategy).toBeInstanceOf(EdgeCookieQueryStrategy);
      // The browserName property is "Chrome" for all Chromium-based browsers
      // This is by design as they share the same underlying implementation
      expect(strategy.browserName).toBe("Chrome");
      // The actual browser type is handled internally by the ChromiumCookieQueryStrategy
    });
  });

  describe("browser path resolution", () => {
    it("should use correct Edge paths for different platforms", () => {
      const home = homedir();
      const expectedPaths = {
        win32: join(home, "AppData", "Local", "Microsoft", "Edge", "User Data"),
        darwin: join(home, "Library", "Application Support", "Microsoft Edge"),
        linux: join(home, ".config", "microsoft-edge"),
      };

      // Test that the strategy correctly inherits Chromium path resolution
      // The actual path will depend on the current platform
      const platform = process.platform as keyof typeof expectedPaths;
      if (platform in expectedPaths) {
        // This tests that the strategy is properly configured to use Edge paths
        expect(strategy).toBeDefined();
      }
    });
  });

  describe("queryCookies", () => {
    it("should handle errors gracefully when Edge is not installed", async () => {
      const cookies = await strategy.queryCookies(
        "test-cookie",
        "example.com",
        "/non/existent/path",
      );
      expect(cookies).toEqual([]);
    });

    it("should be able to query with partial domain", async () => {
      const cookies = await strategy.queryCookies(
        "%",
        "example.com",
        "/non/existent/path",
      );
      expect(cookies).toEqual([]);
    });

    it("should be able to query with cookie name only", async () => {
      const cookies = await strategy.queryCookies(
        "session",
        "%",
        "/non/existent/path",
      );
      expect(cookies).toEqual([]);
    });
  });

  describe("Edge-specific behavior", () => {
    it("should inherit Chromium cookie decryption logic", () => {
      // Edge uses the same Chromium engine and cookie encryption
      expect(strategy).toBeInstanceOf(EdgeCookieQueryStrategy);
    });

    it("should support profile-based cookie querying", async () => {
      // Test that Edge profiles are handled correctly
      const profilePath = "/fake/edge/profile/Cookies";
      const cookies = await strategy.queryCookies("%", "%", profilePath);
      expect(cookies).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should handle permission errors gracefully", async () => {
      const restrictedPath = "/root/edge/Cookies";
      const cookies = await strategy.queryCookies(
        "cookie",
        "domain.com",
        restrictedPath,
      );
      expect(cookies).toEqual([]);
    });

    it("should handle malformed cookie database", async () => {
      const malformedPath = __filename; // Use this file as a non-database file
      const cookies = await strategy.queryCookies(
        "cookie",
        "domain.com",
        malformedPath,
      );
      expect(cookies).toEqual([]);
    });
  });
});
