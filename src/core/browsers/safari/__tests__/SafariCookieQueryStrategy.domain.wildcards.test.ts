import { homedir } from "node:os";

import type { BinaryCookieRow } from "../../../../types/schemas";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";
import { decodeBinaryCookies } from "../decodeBinaryCookies";

// Mock decodeBinaryCookies
jest.mock("../decodeBinaryCookies");

// Mock os.homedir and path.join
jest.mock("os", () => ({
  homedir: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

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
