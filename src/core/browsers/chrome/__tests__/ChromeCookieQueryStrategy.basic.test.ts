import { getEncryptedChromeCookie } from "../../getEncryptedChromeCookie";
import { ChromeCookieQueryStrategy } from "../ChromeCookieQueryStrategy";

jest.mock("../../getEncryptedChromeCookie");

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
    (getEncryptedChromeCookie as jest.Mock).mockResolvedValue([]);
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
