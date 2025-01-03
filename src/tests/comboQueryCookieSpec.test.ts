import MockCookieQueryStrategy from "../core/browsers/mock/MockCookieQueryStrategy";
import { comboQueryCookieSpec } from "../core/cookies/comboQueryCookieSpec";
import { CookieQueryOptions } from "../core/cookies/cookieQueryOptions";
import type {
  CookieQueryStrategy,
  MultiCookieSpec,
  ExportedCookie,
} from "../types/schemas";

const createTestCookie = (): ExportedCookie => ({
  name: "test",
  value: "test",
  domain: "example.com",
  expiry: "Infinity",
});

describe("comboQueryCookieSpec basic functionality", () => {
  let cookieSpec: MultiCookieSpec;
  let options: CookieQueryOptions<CookieQueryStrategy>;
  let mockStrategy: MockCookieQueryStrategy;

  beforeEach(() => {
    cookieSpec = {
      name: "test",
      domain: "example.com",
    };
    mockStrategy = new MockCookieQueryStrategy([createTestCookie()]);
    options = {
      strategy: mockStrategy,
    };
  });

  it("should return an array of cookies", async () => {
    const result = await comboQueryCookieSpec(cookieSpec, options);
    const cookies = result;
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies.length).toBeGreaterThan(0);
  });

  it("should return cookies with correct properties", async () => {
    const result = await comboQueryCookieSpec(cookieSpec, options);
    const cookies = result;
    const cookie = cookies[0];

    expect(cookie.domain).toBe("example.com");
    expect(cookie.name).toBe("test");
    expect(cookie.value).toBe("test");
    expect(cookie.expiry).toBe("Infinity");
    expect(cookie.meta).toBeUndefined();
  });
});

describe("comboQueryCookieSpec options handling", () => {
  let cookieSpec: MultiCookieSpec;
  let options: CookieQueryOptions<CookieQueryStrategy>;
  let mockStrategy: MockCookieQueryStrategy;

  beforeEach(() => {
    cookieSpec = {
      name: "test",
      domain: "example.com",
    };
    mockStrategy = new MockCookieQueryStrategy([createTestCookie()]);
    options = {
      strategy: mockStrategy,
    };
  });

  it("should limit the number of cookies returned", async () => {
    options.limit = 5;
    const result = await comboQueryCookieSpec(cookieSpec, options);
    const cookies = result;
    expect(cookies.length).toBeLessThanOrEqual(5);
  });

  it("should handle undefined limit", async () => {
    options.limit = undefined;
    const result = await comboQueryCookieSpec(cookieSpec, options);
    const cookies = result;
    expect(Array.isArray(cookies)).toBe(true);
  });

  it("should handle removeExpired option", async () => {
    options.removeExpired = false;
    const result = await comboQueryCookieSpec(cookieSpec, options);
    const cookies = result;
    expect(Array.isArray(cookies)).toBe(true);
  });
});
