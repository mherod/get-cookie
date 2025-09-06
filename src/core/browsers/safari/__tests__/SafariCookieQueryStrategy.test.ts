import { homedir } from "node:os";

import type { BinaryCookieRow } from "../../../../types/schemas";
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

describe("SafariCookieQueryStrategy - Core", () => {
  let strategy: SafariCookieQueryStrategy;
  const _mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;
  const originalHome = process.env.HOME;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
    process.env.HOME = "/mock/home";
  });

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  describe("Basic Functionality", () => {
    it("should return 'Safari' as the browser name", () => {
      expect(strategy.browserName).toBe("Safari");
    });

    it("should return empty array when HOME is not set", async () => {
      mockHomedir.mockReturnValue("");
      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toEqual([]);
    });
  });
});

describe("SafariCookieQueryStrategy - Error Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
  });

  it("should handle decoding errors gracefully", async () => {
    mockDecodeBinaryCookies.mockImplementation(() => {
      throw new Error("Failed to decode");
    });

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });

  it("should handle missing cookie file", async () => {
    mockDecodeBinaryCookies.mockImplementation(() => {
      const error = new Error("ENOENT: no such file or directory");
      (error as NodeJS.ErrnoException).code = "ENOENT";
      throw error;
    });

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });

  it("should handle non-Error objects in catch block", async () => {
    mockDecodeBinaryCookies.mockImplementation(() => {
      throw new Error("Not a string error");
    });

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Path Resolution", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
  });

  it("should handle missing HOME directory gracefully", async () => {
    mockHomedir.mockReturnValue("");
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Empty Results", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
  });

  it("should handle empty cookie array from decodeBinaryCookies", async () => {
    mockDecodeBinaryCookies.mockReturnValue([]);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Home Directory Edge Cases", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
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

describe("SafariCookieQueryStrategy - Undefined Values", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
  });

  it("should handle undefined cookie domain", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: undefined as unknown as string,
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(0);
  });

  it("should handle undefined cookie name", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: undefined as unknown as string,
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(0);
  });
});
