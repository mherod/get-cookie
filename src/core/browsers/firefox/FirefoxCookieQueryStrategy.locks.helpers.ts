/**
 * @file Helper functions for Firefox database lock testing
 * This file contains utility functions to set up mocks for database lock scenarios.
 * It is not a test file itself, but provides shared functionality for test files.
 */

import type {
  MockFastGlob,
  MockProcessDetector,
  MockSQLUtilities,
  TestSetup,
} from "./__tests__/FirefoxCookieQueryStrategy.locks.setup";

/**
 * Helper function to set up common mocks for database lock tests
 * @param testSetup - The test setup object containing mock paths
 * @returns Object containing all the mocked functions
 */
export function setupDatabaseLockMocks(testSetup: TestSetup): {
  connectionManager: { executeQuery: jest.Mock };
  queryMonitor: { executeQuery: jest.Mock };
  sync: MockFastGlob["sync"];
  isFirefoxRunning: MockProcessDetector["isFirefoxRunning"];
} {
  const { getGlobalConnectionManager } = jest.requireMock<MockSQLUtilities>(
    "../sql/DatabaseConnectionManager",
  );
  const { getGlobalQueryMonitor } = jest.requireMock<MockSQLUtilities>(
    "../sql/QueryMonitor",
  );
  const { sync } = jest.requireMock<MockFastGlob>("fast-glob");
  const { isFirefoxRunning } = jest.requireMock<MockProcessDetector>(
    "@utils/ProcessDetector",
  );

  // Mock finding Firefox cookie files
  sync.mockReturnValue([testSetup.mockCookieDbPath]);

  // Mock database lock error
  const lockError = new Error("database is locked");
  const mockExecuteQuery = jest.fn().mockRejectedValue(lockError);
  const connectionManager = {
    executeQuery: mockExecuteQuery,
  };
  const queryMonitor = {
    executeQuery: jest.fn(),
  };

  getGlobalConnectionManager.mockReturnValue(connectionManager);
  getGlobalQueryMonitor.mockReturnValue(queryMonitor);

  return { connectionManager, queryMonitor, sync, isFirefoxRunning };
}
