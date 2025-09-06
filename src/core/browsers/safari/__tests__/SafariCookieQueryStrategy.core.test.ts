import { homedir } from "node:os";

import { decodeBinaryCookies } from "../decodeBinaryCookies";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";

// Mock decodeBinaryCookies
jest.mock("../decodeBinaryCookies");

// Mock SystemPermissions utilities
jest.mock("@utils/SystemPermissions", () => ({
  checkFilePermission: jest.fn().mockResolvedValue(true),
  handleSafariPermissionError: jest.fn().mockResolvedValue(false),
}));
// Mock os.homedir and path.join
jest.mock("node:os", () => ({
  homedir: jest.fn().mockReturnValue("/Users/testuser"),
  platform: jest.fn().mockReturnValue("darwin"),
}));
jest.mock("node:path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

describe("SafariCookieQueryStrategy - Basic", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
    jest.clearAllMocks();
  });

  it("should return 'Safari' as the browser name", () => {
    expect(strategy.browserName).toBe("Safari");
  });

  it("should return empty array when HOME is not set", async () => {
    mockHomedir.mockReturnValue("");
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });

  it("should handle empty cookie array from decodeBinaryCookies", async () => {
    mockDecodeBinaryCookies.mockReturnValue([]);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Edge Cases", () => {
  let strategy: SafariCookieQueryStrategy;
  const _mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
    jest.clearAllMocks();
  });

  it("should handle non-string homedir return value", async () => {
    mockHomedir.mockReturnValue(undefined as unknown as string);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });

  it("should handle null homedir return value", async () => {
    mockHomedir.mockReturnValue(null as unknown as string);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});
