import { describe, expect, test } from "@jest/globals";

import {
  CookieDomainSchema,
  CookieNameSchema,
  CookiePathSchema,
} from "../schemas";

describe("CookieDomainSchema", () => {
  test("accepts valid domains", () => {
    expect(CookieDomainSchema.parse("example.com")).toBe("example.com");
    expect(CookieDomainSchema.parse(".example.com")).toBe(".example.com");
    expect(CookieDomainSchema.parse("sub.example.com")).toBe("sub.example.com");
    expect(CookieDomainSchema.parse("localhost")).toBe("localhost");
    expect(CookieDomainSchema.parse("192.168.1.1")).toBe("192.168.1.1");
  });

  test("rejects invalid domains", () => {
    expect(() => CookieDomainSchema.parse("")).toThrow();
    expect(() => CookieDomainSchema.parse(" ")).toThrow();
    expect(() => CookieDomainSchema.parse("invalid domain")).toThrow();
    expect(() => CookieDomainSchema.parse("example..com")).toThrow();
    expect(() => CookieDomainSchema.parse("-example.com")).toThrow();
    expect(() => CookieDomainSchema.parse("example-.com")).toThrow();
    expect(() => CookieDomainSchema.parse("256.256.256.256")).toThrow();
  });
});

describe("CookieNameSchema", () => {
  test("accepts valid cookie names", () => {
    expect(CookieNameSchema.parse("session")).toBe("session");
    expect(CookieNameSchema.parse("auth_token")).toBe("auth_token");
    expect(CookieNameSchema.parse("user-preference")).toBe("user-preference");
    expect(CookieNameSchema.parse("%")).toBe("%");
    expect(CookieNameSchema.parse("!#$%&'()*+-.:^_`|~")).toBe(
      "!#$%&'()*+-.:^_`|~",
    );
  });

  test("rejects invalid cookie names", () => {
    expect(() => CookieNameSchema.parse("")).toThrow();
    expect(() => CookieNameSchema.parse(" ")).toThrow();
    expect(() => CookieNameSchema.parse("session;")).toThrow();
    expect(() => CookieNameSchema.parse("my cookie")).toThrow();
    expect(() => CookieNameSchema.parse("cookie=value")).toThrow();
    expect(() => CookieNameSchema.parse("cookie,name")).toThrow();
  });
});

describe("CookiePathSchema", () => {
  test("accepts valid paths", () => {
    expect(CookiePathSchema.parse("/")).toBe("/");
    expect(CookiePathSchema.parse("/api")).toBe("/api");
    expect(CookiePathSchema.parse("/path/to/page")).toBe("/path/to/page");
    expect(CookiePathSchema.parse("/path-with/special@chars~")).toBe(
      "/path-with/special@chars~",
    );
  });

  test("rejects invalid paths", () => {
    expect(() => CookiePathSchema.parse("")).toThrow();
    expect(() => CookiePathSchema.parse(" ")).toThrow();
    expect(() => CookiePathSchema.parse("invalid")).toThrow();
    expect(() => CookiePathSchema.parse("/path?query")).toThrow();
    expect(() => CookiePathSchema.parse("/path#fragment")).toThrow();
    expect(() => CookiePathSchema.parse("/path with spaces")).toThrow();
  });

  test("defaults to root path", () => {
    expect(CookiePathSchema.parse(undefined)).toBe("/");
  });
});
