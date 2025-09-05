import { setupDatabaseLockMocks } from "../FirefoxCookieQueryStrategy.locks.helpers";

import {
  type MockProcessDetector,
  type TestSetup,
  cleanupTest,
  createMockCookieDatabase,
  setupTest,
} from "./FirefoxCookieQueryStrategy.locks.setup";

describe("FirefoxCookieQueryStrategy - Database Lock Handling", () => {
  let testSetup: TestSetup;

  beforeEach(() => {
    testSetup = setupTest();
  });

  afterEach(() => {
    cleanupTest(testSetup.tempDir);
  });

  describe("database lock error handling", () => {
    it("should call Firefox process detection when database lock error occurs", async () => {
      const mocks = setupDatabaseLockMocks(testSetup);
      const { getBrowserConflictAdvice } =
        jest.requireMock<MockProcessDetector>("@utils/ProcessDetector");

      // Mock Firefox process detection
      mocks.isFirefoxRunning.mockResolvedValue([
        { pid: 1234, command: "firefox", details: "firefox process" },
      ]);
      getBrowserConflictAdvice.mockReturnValue(
        "Firefox is running - close it first",
      );

      // Create a minimal SQLite database file
      createMockCookieDatabase(testSetup.mockCookieDbPath);

      // Execute the query - it should handle the lock error internally
      const result = await testSetup.strategy.queryCookies(
        "test",
        "example.com",
      );

      // Should return empty array due to error handling
      expect(result).toEqual([]);

      // Verify that Firefox process detection was called
      expect(mocks.isFirefoxRunning).toHaveBeenCalled();
      expect(getBrowserConflictAdvice).toHaveBeenCalledWith("firefox", [
        {
          pid: 1234,
          command: "firefox",
          details: "PID: 1234, Command: firefox",
        },
      ]);
    }, 10000); // Increase timeout to 10 seconds for CI environments

    it("should handle database lock with no Firefox processes detected", async () => {
      const mocks = setupDatabaseLockMocks(testSetup);

      // Mock no Firefox processes
      mocks.isFirefoxRunning.mockResolvedValue([]);

      // Create database and execute query
      createMockCookieDatabase(testSetup.mockCookieDbPath);
      const result = await testSetup.strategy.queryCookies(
        "test",
        "example.com",
      );

      // Verify results and process detection
      expect(result).toEqual([]);
      expect(mocks.isFirefoxRunning).toHaveBeenCalled();
    });
  });

  describe("SafeFileOperations integration", () => {
    it("should have SafeFileOperations available for fallback operations", () => {
      // This test verifies that the SafeFileOperations utility exists
      // and can be imported for use in database lock scenarios
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
        const SafeFileOperations = require("../../../../utils/SafeFileOperations");
        expect(SafeFileOperations).toBeDefined();
      }).not.toThrow();
    });
  });
});
