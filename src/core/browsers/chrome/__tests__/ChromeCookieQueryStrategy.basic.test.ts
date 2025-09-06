import { ChromeCookieQueryStrategy } from "../ChromeCookieQueryStrategy";
import { getGlobalConnectionManager } from "../../sql/DatabaseConnectionManager";
import { getGlobalQueryMonitor } from "../../sql/QueryMonitor";
import { CookieQueryBuilder } from "../../sql/CookieQueryBuilder";

jest.mock("../../sql/DatabaseConnectionManager");
jest.mock("../../sql/QueryMonitor");
jest.mock("../../sql/CookieQueryBuilder");
jest.mock("../decrypt");
jest.mock("../getChromiumPassword");
jest.mock("../../listChromeProfiles");

// Mock the createTaggedLogger function directly
jest.mock("@utils/logHelpers", () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
    withTag: jest.fn(),
  };

  mockLogger.withTag.mockReturnValue(mockLogger);

  return {
    createTaggedLogger: jest.fn(() => mockLogger),
    logError: jest.fn(),
    logOperationResult: jest.fn(),
    logWarn: jest.fn(),
    logger: mockLogger,
  };
});

describe("ChromeCookieQueryStrategy - Basic", () => {
  let strategy: ChromeCookieQueryStrategy;
  const originalPlatform = process.platform;

  beforeEach(() => {
    jest.resetAllMocks();
    strategy = new ChromeCookieQueryStrategy();

    // Setup SQL utility mocks
    const mockExecuteQuery = jest.fn().mockImplementation((_file, callback) => {
      return callback({});
    });

    const mockConnectionManager = {
      executeQuery: mockExecuteQuery,
    };

    const mockMonitor = {
      executeQuery: jest.fn().mockReturnValue([]),
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
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  it('should return "Chrome" as the browser name', () => {
    expect(strategy.browserName).toBe("Chrome");
  });

  it("should return empty array for non-darwin platforms", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
    });

    const cookies = await strategy.queryCookies("test", "example.com");
    expect(cookies).toEqual([]);
  });
});
