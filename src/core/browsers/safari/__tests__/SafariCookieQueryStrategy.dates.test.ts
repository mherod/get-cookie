import { homedir } from "node:os";

import type { BinaryCookieRow } from "../../../../types/schemas";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";
import { decodeBinaryCookies } from "../decodeBinaryCookies";

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
}));

jest.mock("node:path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

describe("SafariCookieQueryStrategy - Expiry Dates", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const _mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
    jest.clearAllMocks();
  });

  it("should handle valid expiry dates", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toBeInstanceOf(Date);
    expect((cookies[0].expiry as Date).getTime()).toBe(1234567890 * 1000);
  });

  it("should handle session cookies (expiry = 0)", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 0,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toBe("Infinity");
  });

  it("should handle negative expiry", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: -1,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toBe("Infinity");
  });

  it("should handle undefined expiry", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: undefined as unknown as number,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    // Changed behavior: undefined expiry now returns undefined instead of NaN Date
    expect(cookies[0].expiry).toBeUndefined();
  });
});

describe("SafariCookieQueryStrategy - Creation Dates", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const _mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    strategy = new SafariCookieQueryStrategy();
    jest.clearAllMocks();
  });

  it("should handle undefined creation date", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: undefined as unknown as number,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].meta?.creation).toBeUndefined();
  });

  it("should include creation date in meta", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].meta?.creation).toBe(1234567890 * 1000);
  });
});
