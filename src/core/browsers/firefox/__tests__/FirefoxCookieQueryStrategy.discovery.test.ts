import { FirefoxCookieQueryStrategy } from "../FirefoxCookieQueryStrategy";

// Mock the glob sync function
jest.mock("glob", () => ({
  sync: jest.fn(),
}));

interface MockGlob {
  sync: jest.Mock;
}

describe("FirefoxCookieQueryStrategy - File Discovery", () => {
  let strategy: FirefoxCookieQueryStrategy;
  const originalHome = process.env.HOME;

  beforeEach(() => {
    strategy = new FirefoxCookieQueryStrategy();
    process.env.HOME = "/mock/home";
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  it("should find cookie files in macOS paths", async () => {
    const { sync } = jest.requireMock<MockGlob>("glob");
    sync.mockImplementation((pattern: string) => {
      if (pattern.includes("Library/Application Support/Firefox")) {
        return [
          "/mock/home/Library/Application Support/Firefox/Profiles/abc123/cookies.sqlite",
        ];
      }
      return [];
    });

    await strategy.queryCookies("test-cookie", "example.com");
    expect(sync).toHaveBeenCalledWith(
      expect.stringContaining(
        "Library/Application Support/Firefox/Profiles/*/cookies.sqlite",
      ),
    );
  });

  it("should find cookie files in Linux paths", async () => {
    const { sync } = jest.requireMock<MockGlob>("glob");
    sync.mockImplementation((pattern: string) => {
      if (pattern.includes(".mozilla/firefox")) {
        return ["/mock/home/.mozilla/firefox/xyz789/cookies.sqlite"];
      }
      return [];
    });

    await strategy.queryCookies("test-cookie", "example.com");
    expect(sync).toHaveBeenCalledWith(
      expect.stringContaining(".mozilla/firefox/*/cookies.sqlite"),
    );
  });

  it("should handle missing HOME environment variable", async () => {
    process.env.HOME = "";
    const result = await strategy.queryCookies("test-cookie", "example.com");
    expect(result).toEqual([]);
  });
});
