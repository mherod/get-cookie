import { FirefoxCookieQueryStrategy } from "../FirefoxCookieQueryStrategy";

// Mock fast-glob
jest.mock("fast-glob", () => ({
  sync: jest.fn(),
}));

// Mock file system for directory checks
jest.mock("node:fs", () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

// Mock platform utils
jest.mock("@utils/platformUtils", () => ({
  getPlatform: jest.fn(),
  isMacOS: jest.fn(),
  isWindows: jest.fn(),
  isLinux: jest.fn(),
}));

// Mock PlatformBrowserControl
jest.mock("../../platform/PlatformBrowserControl", () => ({
  createPlatformBrowserControl: jest.fn().mockReturnValue({
    closeBrowserGracefully: jest.fn().mockResolvedValue(false),
    closeBrowserForAction: jest.fn().mockResolvedValue(null),
    waitForBrowserToClose: jest.fn().mockResolvedValue(false),
  }),
}));

interface MockFastGlob {
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
    const { getPlatform } = await import("@utils/platformUtils");
    jest.mocked(getPlatform).mockReturnValue("darwin");

    const { sync } = jest.requireMock<MockFastGlob>("fast-glob");
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
      expect.stringMatching(
        /Library[/\\]Application Support[/\\]Firefox[/\\]Profiles[/\\]\*[/\\]cookies\.sqlite/,
      ),
    );
  });

  it("should find cookie files in Linux paths", async () => {
    const { getPlatform } = await import("@utils/platformUtils");
    jest.mocked(getPlatform).mockReturnValue("linux");

    const { sync } = jest.requireMock<MockFastGlob>("fast-glob");
    sync.mockImplementation((pattern: string) => {
      if (pattern.includes(".mozilla/firefox")) {
        return ["/mock/home/.mozilla/firefox/xyz789/cookies.sqlite"];
      }
      return [];
    });

    await strategy.queryCookies("test-cookie", "example.com");
    expect(sync).toHaveBeenCalledWith(
      expect.stringMatching(/\.mozilla[/\\]firefox[/\\]\*[/\\]cookies\.sqlite/),
    );
  });

  it("should handle missing HOME environment variable", async () => {
    process.env.HOME = "";
    const result = await strategy.queryCookies("test-cookie", "example.com");
    expect(result).toEqual([]);
  });
});
