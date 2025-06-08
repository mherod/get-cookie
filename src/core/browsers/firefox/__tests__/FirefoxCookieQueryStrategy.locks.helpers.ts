import type {
  MockProcessDetector,
  MockQuerySqlite,
  MockFastGlob,
  TestSetup,
} from "./FirefoxCookieQueryStrategy.locks.setup";

/**
 * Helper function to set up common mocks for database lock tests
 * @param testSetup - The test setup object containing mock paths
 * @returns Object containing all the mocked functions
 */
export function setupDatabaseLockMocks(testSetup: TestSetup): {
  querySqliteThenTransform: MockQuerySqlite["querySqliteThenTransform"];
  sync: MockFastGlob["sync"];
  isFirefoxRunning: MockProcessDetector["isFirefoxRunning"];
} {
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

  return { querySqliteThenTransform, sync, isFirefoxRunning };
}
