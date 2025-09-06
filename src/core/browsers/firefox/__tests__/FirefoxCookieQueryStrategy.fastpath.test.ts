import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import fg from "fast-glob";

import { getPlatform } from "@utils/platformUtils";

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
const mockGetPlatform = getPlatform as jest.MockedFunction<typeof getPlatform>;

// Helper functions to reduce main describe block complexity
function setupMocksForNoFirefox(): void {
  mockExistsSync.mockReturnValue(false);
  mockFg.sync.mockReturnValue([]);
}

function setupMocksForInstalledFirefox(platform: string): void {
  mockGetPlatform.mockReturnValue(platform as "darwin" | "win32" | "linux");
  mockExistsSync.mockReturnValue(true);
}

function expectNoGlobCalls(): void {
  expect(mockFg.sync).not.toHaveBeenCalled();
}

function expectEmptyResult(result: unknown[]): void {
  expect(result).toEqual([]);
}

describe("FirefoxCookieQueryStrategy - Fast Path Optimization", () => {
  let strategy: FirefoxCookieQueryStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new FirefoxCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/test");
  });

  it("should skip glob operations when Firefox profile directory doesn't exist", async () => {
    setupMocksForNoFirefox();
    const result = await strategy.queryCookies("test", "example.com");
    expectNoGlobCalls();
    expectEmptyResult(result);
  });

  it("should check platform-specific Firefox directories", async () => {
    const testCases = [
      {
        platform: "darwin",
        expectedPath: "Library/Application Support/Firefox",
      },
      { platform: "win32", expectedPath: "AppData/Roaming/Mozilla/Firefox" },
      { platform: "linux", expectedPath: ".mozilla/firefox" },
    ];

    for (const { platform, expectedPath } of testCases) {
      mockGetPlatform.mockReturnValue(platform as "darwin" | "win32" | "linux");
      setupMocksForNoFirefox();
      await strategy.queryCookies("test", "example.com");
      expect(mockExistsSync).toHaveBeenCalledWith(
        join("/Users/test", expectedPath),
      );
    }
  });

  it("should perform glob operations when Firefox profile directory exists", async () => {
    setupMocksForInstalledFirefox("darwin");
    mockFg.sync.mockReturnValue([
      join(
        "/Users/test",
        "Library/Application Support/Firefox/Profiles/abc123/cookies.sqlite",
      ),
    ]);
    await strategy.queryCookies("test", "example.com");
    expect(mockFg.sync).toHaveBeenCalledWith(
      join(
        "/Users/test",
        "Library/Application Support/Firefox/Profiles/*/cookies.sqlite",
      ),
    );
  });

  it("should find multiple Firefox profiles", async () => {
    setupMocksForInstalledFirefox("darwin");
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

  it("should return empty array for unsupported platforms", async () => {
    mockGetPlatform.mockReturnValue("unknown" as "darwin" | "win32" | "linux");
    const result = await strategy.queryCookies("test", "example.com");
    expectEmptyResult(result);
    expect(mockExistsSync).not.toHaveBeenCalled();
    expectNoGlobCalls();
  });

  it("should return empty array when homedir is not available", async () => {
    mockHomedir.mockReturnValue("");
    const result = await strategy.queryCookies("test", "example.com");
    expectEmptyResult(result);
    expect(mockExistsSync).not.toHaveBeenCalled();
    expectNoGlobCalls();
  });
});
