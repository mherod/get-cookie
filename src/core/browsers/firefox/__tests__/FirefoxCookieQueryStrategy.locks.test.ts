import {
  setupTest,
  cleanupTest,
  createMockCookieDatabase,
  type MockProcessDetector,
  type MockQuerySqlite,
  type MockFastGlob,
  type TestSetup,
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
      const { querySqliteThenTransform } = jest.requireMock<MockQuerySqlite>(
        "../../QuerySqliteThenTransform",
      );
      const { sync } = jest.requireMock<MockFastGlob>("fast-glob");
      const { isFirefoxRunning, getBrowserConflictAdvice } =
        jest.requireMock<MockProcessDetector>("@utils/ProcessDetector");

      // Mock finding Firefox cookie files
      sync.mockReturnValue([testSetup.mockCookieDbPath]);

      // Mock database lock error
      const lockError = new Error("database is locked");
      querySqliteThenTransform.mockRejectedValue(lockError);

      // Mock Firefox process detection
      isFirefoxRunning.mockResolvedValue([
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
      expect(isFirefoxRunning).toHaveBeenCalled();
      expect(getBrowserConflictAdvice).toHaveBeenCalledWith("firefox", [
        { pid: 1234, command: "firefox", details: "firefox process" },
      ]);
    });

    it("should handle database lock with no Firefox processes detected", async () => {
      const { querySqliteThenTransform } = jest.requireMock<MockQuerySqlite>(
        "../../QuerySqliteThenTransform",
      );
      const { sync } = jest.requireMock<MockFastGlob>("fast-glob");
      const { isFirefoxRunning } = jest.requireMock<MockProcessDetector>(
        "@utils/ProcessDetector",
      );

      // Mock finding Firefox cookie files
      sync.mockReturnValue([testSetup.mockCookieDbPath]);

      // Mock database lock error
      const lockError = new Error("database is locked");
      querySqliteThenTransform.mockRejectedValue(lockError);

      // Mock no Firefox processes
      isFirefoxRunning.mockResolvedValue([]);

      // Create a minimal SQLite database file
      createMockCookieDatabase(testSetup.mockCookieDbPath);

      // Execute the query
      const result = await testSetup.strategy.queryCookies(
        "test",
        "example.com",
      );

      // Should return empty array due to error handling
      expect(result).toEqual([]);

      // Verify that Firefox process detection was called
      expect(isFirefoxRunning).toHaveBeenCalled();
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
