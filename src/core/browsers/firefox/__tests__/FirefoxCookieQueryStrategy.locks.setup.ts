import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { FirefoxCookieQueryStrategy } from "../FirefoxCookieQueryStrategy";

// Mock the ProcessDetector
jest.mock("@utils/ProcessDetector");

// Mock platform utils to ensure consistent behavior across platforms
jest.mock("@utils/platformUtils", () => ({
  getPlatform: jest.fn().mockReturnValue("darwin"),
  isMacOS: jest.fn().mockReturnValue(true),
  isWindows: jest.fn().mockReturnValue(false),
  isLinux: jest.fn().mockReturnValue(false),
}));

// Mock PlatformBrowserControl to avoid platform-specific issues
jest.mock("../../platform/PlatformBrowserControl", () => ({
  createPlatformBrowserControl: jest.fn().mockReturnValue({
    closeBrowserGracefully: jest.fn().mockResolvedValue(false),
    closeBrowserForAction: jest.fn().mockResolvedValue(null),
    waitForBrowserToClose: jest.fn().mockResolvedValue(false),
  }),
}));

// Mock the logger to avoid console output during tests
jest.mock("@utils/logHelpers", () => ({
  createTaggedLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
  }),
}));

// Mock the new SQL utilities to simulate database operations
jest.mock("../../sql/DatabaseConnectionManager", () => ({
  getGlobalConnectionManager: jest.fn(() => ({
    executeQuery: jest.fn(),
  })),
  resetGlobalConnectionManager: jest.fn(),
}));

jest.mock("../../sql/QueryMonitor", () => ({
  getGlobalQueryMonitor: jest.fn(() => ({
    executeQuery: jest.fn(),
  })),
  resetGlobalQueryMonitor: jest.fn(),
}));

// Mock fast-glob to control which files are found
jest.mock("fast-glob", () => ({
  sync: jest.fn(),
}));

// Mock file system existsSync while keeping other fs functions
jest.mock("node:fs", () => {
  const actualFs = jest.requireActual<typeof import("node:fs")>("node:fs");
  return {
    ...actualFs,
    existsSync: jest.fn().mockReturnValue(true), // Assume Firefox is installed for these tests
  };
});

/** Mock interface for ProcessDetector */
export interface MockProcessDetector {
  isFirefoxRunning: jest.Mock;
  getBrowserConflictAdvice: jest.Mock;
}

/** Mock interface for SQL utilities */
export interface MockSQLUtilities {
  getGlobalConnectionManager: jest.Mock;
  getGlobalQueryMonitor: jest.Mock;
}

/** Mock interface for fast-glob */
export interface MockFastGlob {
  sync: jest.Mock;
}

/** Test setup configuration */
export interface TestSetup {
  strategy: FirefoxCookieQueryStrategy;
  tempDir: string;
  mockCookieDbPath: string;
}

/**
 * Set up test environment
 * @returns Test setup configuration
 */
export function setupTest(): TestSetup {
  const strategy = new FirefoxCookieQueryStrategy();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "firefox-test-"));
  const mockCookieDbPath = path.join(tempDir, "cookies.sqlite");

  // Reset all mocks
  jest.clearAllMocks();

  // Set up process.env.HOME for the strategy
  process.env.HOME = tempDir;

  return { strategy, tempDir, mockCookieDbPath };
}

/**
 * Clean up test environment
 * @param tempDir - Temporary directory to clean up
 */
export function cleanupTest(tempDir: string): void {
  // Clean up temp directory
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (_error) {
    // Ignore cleanup errors
  }
}

/**
 * Creates a minimal mock SQLite database file for testing
 * @param dbPath - Path where the mock database file should be created
 */
export function createMockCookieDatabase(dbPath: string): void {
  // Create directory if it doesn't exist
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create a minimal SQLite database file
  // This is just a placeholder - real SQLite integration would require more setup
  const mockSqliteHeader = Buffer.from([
    0x53,
    0x51,
    0x4c,
    0x69,
    0x74,
    0x65,
    0x20,
    0x66, // "SQLite format 3"
    0x6f,
    0x72,
    0x6d,
    0x61,
    0x74,
    0x20,
    0x33,
    0x00,
  ]);

  fs.writeFileSync(dbPath, mockSqliteHeader);
}
