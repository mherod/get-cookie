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

// Mock the sqlite query function
jest.mock("../../QuerySqliteThenTransform", () => ({
  querySqliteThenTransform: jest.fn(),
}));

interface MockGlob {
  sync: jest.Mock;
}

interface MockQuerySqlite {
  querySqliteThenTransform: jest.Mock;
}

describe("FirefoxCookieQueryStrategy - Empty Results", () => {
  let strategy: FirefoxCookieQueryStrategy;

  beforeEach(() => {
    strategy = new FirefoxCookieQueryStrategy();
    process.env.HOME = "/mock/home";
    jest.clearAllMocks();
  });

  it("should handle empty cookie results", async () => {
    const { querySqliteThenTransform } = jest.requireMock<MockQuerySqlite>(
      "../../QuerySqliteThenTransform",
    );
    const { sync } = jest.requireMock<MockGlob>("glob");

    sync.mockReturnValue(["/mock/path/cookies.sqlite"]);
    querySqliteThenTransform.mockResolvedValue([]);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});
