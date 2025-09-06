import { FirefoxCookieQueryStrategy } from "../FirefoxCookieQueryStrategy";

// Mock the glob sync function
jest.mock("glob", () => ({
  sync: jest.fn(),
}));

// Mock the logger
jest.mock("@utils/logger", () => ({
  __esModule: true,
  default: {
    withTag: jest.fn().mockReturnValue({
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

// Mock the new SQL utilities
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

interface MockGlob {
  sync: jest.Mock;
}

interface MockSQLUtilities {
  getGlobalConnectionManager: jest.Mock;
  getGlobalQueryMonitor: jest.Mock;
}

describe("FirefoxCookieQueryStrategy - Empty Results", () => {
  let strategy: FirefoxCookieQueryStrategy;

  beforeEach(() => {
    strategy = new FirefoxCookieQueryStrategy();
    process.env.HOME = "/mock/home";
    jest.clearAllMocks();
  });

  it("should handle empty cookie results", async () => {
    const { getGlobalConnectionManager } = jest.requireMock<MockSQLUtilities>(
      "../../sql/DatabaseConnectionManager",
    );
    const { getGlobalQueryMonitor } = jest.requireMock<MockSQLUtilities>(
      "../../sql/QueryMonitor",
    );
    const { sync } = jest.requireMock<MockGlob>("glob");

    sync.mockReturnValue(["/mock/path/cookies.sqlite"]);

    const mockExecuteQuery = jest.fn().mockResolvedValue([]);
    const mockMonitorExecuteQuery = jest.fn().mockReturnValue([]);

    getGlobalConnectionManager.mockReturnValue({
      executeQuery: mockExecuteQuery,
    });

    getGlobalQueryMonitor.mockReturnValue({
      executeQuery: mockMonitorExecuteQuery,
    });

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});
