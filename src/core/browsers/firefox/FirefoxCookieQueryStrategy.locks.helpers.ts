/**
 * @file Helper functions for Firefox database lock testing
 * This file contains utility functions to set up mocks for database lock scenarios.
 * It is not a test file itself, but provides shared functionality for test files.
 */

import type {
  MockProcessDetector,
  MockQuerySqlite,
  MockFastGlob,
  TestSetup,
} from "./__tests__/FirefoxCookieQueryStrategy.locks.setup";

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
    "../QuerySqliteThenTransform",
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
