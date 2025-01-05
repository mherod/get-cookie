import { homedir } from "os";

import type { BinaryCookieRow } from "../../../../types/schemas";
import { decodeBinaryCookies } from "../decodeBinaryCookies";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";

// Mock decodeBinaryCookies
jest.mock("../decodeBinaryCookies");

// Mock os.homedir and path.join
jest.mock("os", () => ({
  homedir: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

describe("SafariCookieQueryStrategy - Name Wildcards", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle wildcard name matching", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie-1",
        value: "value-1",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
      {
        name: "test-cookie-2",
        value: "value-2",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("%", "example.com");
    expect(cookies).toHaveLength(2);
    expect(cookies[0].name).toBe("test-cookie-1");
    expect(cookies[1].name).toBe("test-cookie-2");
  });

  it("should handle empty name", async () => {
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

    const cookies = await strategy.queryCookies("", "example.com");
    expect(cookies).toHaveLength(1);
  });
});

describe("SafariCookieQueryStrategy - Domain Wildcards", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle wildcard domain matching", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "value-1",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
      {
        name: "test-cookie",
        value: "value-2",
        domain: "test.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "%");
    expect(cookies).toHaveLength(2);
    expect(cookies[0].domain).toBe("example.com");
    expect(cookies[1].domain).toBe("test.com");
  });

  it("should handle empty domain", async () => {
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

    const cookies = await strategy.queryCookies("test-cookie", "");
    expect(cookies).toHaveLength(1);
  });
});

describe("SafariCookieQueryStrategy - Double Wildcards", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle both name and domain wildcards", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "any-cookie",
        value: "test-value",
        domain: "any-domain.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("%", "%");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("any-cookie");
    expect(cookies[0].domain).toBe("any-domain.com");
  });

  it("should handle both empty name and domain", async () => {
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

    const cookies = await strategy.queryCookies("", "");
    expect(cookies).toHaveLength(1);
  });
});
