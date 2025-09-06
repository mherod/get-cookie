import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import fg from "fast-glob";

import { FirefoxCookieQueryStrategy } from "../FirefoxCookieQueryStrategy";

// Mock dependencies
jest.mock("node:fs");
jest.mock("node:os");
jest.mock("fast-glob");
jest.mock("@utils/platformUtils", () => ({
  getPlatform: jest.fn().mockReturnValue("darwin"),
  isMacOS: jest.fn().mockReturnValue(true),
  isWindows: jest.fn().mockReturnValue(false),
  isLinux: jest.fn().mockReturnValue(false),
}));
jest.mock("@utils/ProcessDetector", () => ({
  isFirefoxRunning: jest.fn().mockResolvedValue([]),
}));
jest.mock("../../platform/PlatformBrowserControl", () => ({
  createPlatformBrowserControl: jest.fn().mockReturnValue({
    closeBrowserGracefully: jest.fn().mockResolvedValue(false),
    closeBrowserForAction: jest.fn().mockResolvedValue(null),
    waitForBrowserToClose: jest.fn().mockResolvedValue(false),
  }),
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;
const mockFg = fg as jest.Mocked<typeof fg>;

describe("FirefoxCookieQueryStrategy - Fast Path Optimization", () => {
  let strategy: FirefoxCookieQueryStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new FirefoxCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/test");
  });

  describe("when Firefox is not installed", () => {
    it("should skip glob operations when Firefox profile directory doesn't exist", async () => {
      // Firefox profile directory doesn't exist
      mockExistsSync.mockReturnValue(false);
      mockFg.sync.mockReturnValue([]);

      const result = await strategy.queryCookies("test", "example.com");

      // Should not call fast-glob since directory doesn't exist
      expect(mockFg.sync).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("should check for macOS Firefox directory on Darwin", async () => {
      const { getPlatform } = require("@utils/platformUtils");
      getPlatform.mockReturnValue("darwin");

      mockExistsSync.mockReturnValue(false);

      await strategy.queryCookies("test", "example.com");

      expect(mockExistsSync).toHaveBeenCalledWith(
        join("/Users/test", "Library/Application Support/Firefox"),
      );
    });

    it("should check for Windows Firefox directory on Windows", async () => {
      const { getPlatform } = require("@utils/platformUtils");
      getPlatform.mockReturnValue("win32");

      mockExistsSync.mockReturnValue(false);

      await strategy.queryCookies("test", "example.com");

      expect(mockExistsSync).toHaveBeenCalledWith(
        join("/Users/test", "AppData/Roaming/Mozilla/Firefox"),
      );
    });

    it("should check for Linux Firefox directory on Linux", async () => {
      const { getPlatform } = require("@utils/platformUtils");
      getPlatform.mockReturnValue("linux");

      mockExistsSync.mockReturnValue(false);

      await strategy.queryCookies("test", "example.com");

      expect(mockExistsSync).toHaveBeenCalledWith(
        join("/Users/test", ".mozilla/firefox"),
      );
    });
  });

  describe("when Firefox is installed", () => {
    it("should perform glob operations when Firefox profile directory exists", async () => {
      const { getPlatform } = require("@utils/platformUtils");
      getPlatform.mockReturnValue("darwin");

      // Firefox profile directory exists
      mockExistsSync.mockReturnValue(true);
      mockFg.sync.mockReturnValue([
        join(
          "/Users/test",
          "Library/Application Support/Firefox/Profiles/abc123/cookies.sqlite",
        ),
      ]);

      await strategy.queryCookies("test", "example.com");

      // Should call fast-glob since directory exists
      expect(mockFg.sync).toHaveBeenCalledWith(
        join(
          "/Users/test",
          "Library/Application Support/Firefox/Profiles/*/cookies.sqlite",
        ),
      );
    });

    it("should find multiple Firefox profiles", async () => {
      mockExistsSync.mockReturnValue(true);
      mockFg.sync.mockReturnValue([
        join(
          "/Users/test",
          "Library/Application Support/Firefox/Profiles/profile1/cookies.sqlite",
        ),
        join(
          "/Users/test",
          "Library/Application Support/Firefox/Profiles/profile2/cookies.sqlite",
        ),
      ]);

      await strategy.queryCookies("test", "example.com");

      expect(mockFg.sync).toHaveBeenCalled();
    });
  });

  describe("platform support", () => {
    it("should return empty array for unsupported platforms", async () => {
      const { getPlatform } = require("@utils/platformUtils");
      getPlatform.mockReturnValue("unknown");

      const result = await strategy.queryCookies("test", "example.com");

      expect(result).toEqual([]);
      expect(mockExistsSync).not.toHaveBeenCalled();
      expect(mockFg.sync).not.toHaveBeenCalled();
    });
  });

  describe("when home directory is not available", () => {
    it("should return empty array when homedir is not available", async () => {
      mockHomedir.mockReturnValue("");

      const result = await strategy.queryCookies("test", "example.com");

      expect(result).toEqual([]);
      expect(mockExistsSync).not.toHaveBeenCalled();
      expect(mockFg.sync).not.toHaveBeenCalled();
    });
  });
});
