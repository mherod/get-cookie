import { listChromeProfilePaths } from "../listChromeProfiles";
import { CookieQueryBuilder } from "../sql/CookieQueryBuilder";
import { getGlobalConnectionManager } from "../sql/DatabaseConnectionManager";
import { getGlobalQueryMonitor } from "../sql/QueryMonitor";

import { ChromeCookieQueryStrategy } from "./ChromeCookieQueryStrategy";
import { decrypt } from "./decrypt";
import { getChromiumPassword } from "./getChromiumPassword";

jest.mock("./decrypt");
jest.mock("./getChromiumPassword");
jest.mock("../listChromeProfiles");
jest.mock("../sql/DatabaseConnectionManager");
jest.mock("../sql/QueryMonitor");
jest.mock("../sql/CookieQueryBuilder");

/**
 * Mock password used for testing
 */
export const mockPassword = "test-password";

/**
 * Mock cookie file path used for testing
 */
export const mockCookieFile = "/path/to/Cookies";

/**
 * Mock cookie data used for testing
 */
export const mockCookieData = {
  name: "test-cookie",
  value: Buffer.from("encrypted-value"),
  domain: "example.com",
  expiry: Date.now() + 86400000, // 1 day in the future
};

/**
 * Mock SQL row data that would be returned from the database
 */
export const mockSqlRow = {
  encrypted_value: mockCookieData.value,
  name: mockCookieData.name,
  domain: mockCookieData.domain,
  expiry: mockCookieData.expiry,
};

/**
 * Sets up a Chrome test environment with mocked dependencies
 * @returns A configured ChromeCookieQueryStrategy instance
 */
export function setupChromeTest(): ChromeCookieQueryStrategy {
  const strategy = new ChromeCookieQueryStrategy();
  Object.defineProperty(process, "platform", {
    value: "darwin",
  });

  // Setup default mock values without resetting
  (listChromeProfilePaths as unknown as jest.Mock).mockReturnValue([
    mockCookieFile,
  ]);
  (getChromiumPassword as unknown as jest.Mock).mockResolvedValue(mockPassword);

  // Mock SQL utilities
  const mockExecuteQuery = jest.fn().mockImplementation((_file, callback) => {
    return callback({});
  });

  const mockConnectionManager = {
    executeQuery: mockExecuteQuery,
  };

  const mockMonitor = {
    executeQuery: jest.fn().mockReturnValue([mockSqlRow]),
  };

  const mockQueryBuilder = {
    buildSelectQuery: jest.fn().mockReturnValue({
      sql: "SELECT * FROM cookies",
      params: {},
    }),
  };

  (getGlobalConnectionManager as jest.Mock).mockReturnValue(
    mockConnectionManager,
  );
  (getGlobalQueryMonitor as jest.Mock).mockReturnValue(mockMonitor);
  (CookieQueryBuilder as unknown as jest.Mock).mockImplementation(
    () => mockQueryBuilder,
  );

  (decrypt as unknown as jest.Mock).mockResolvedValue("decrypted-value");

  return strategy;
}

// Export mocked functions for test assertions
/**
 * Mock for listChromeProfilePaths function
 */
export const mockListChromeProfilePaths =
  listChromeProfilePaths as unknown as jest.Mock;
/**
 * Mock for getChromiumPassword function
 */
export const mockGetChromiumPassword =
  getChromiumPassword as unknown as jest.Mock;
/**
 * Mock for decrypt function
 */
export const mockDecrypt = decrypt as unknown as jest.Mock;
/**
 * Mock for getGlobalConnectionManager function
 */
export const mockGetGlobalConnectionManager =
  getGlobalConnectionManager as unknown as jest.Mock;
/**
 * Mock for getGlobalQueryMonitor function
 */
export const mockGetGlobalQueryMonitor =
  getGlobalQueryMonitor as unknown as jest.Mock;
/**
 * Mock for CookieQueryBuilder constructor
 */
export const mockCookieQueryBuilder =
  CookieQueryBuilder as unknown as jest.Mock;
