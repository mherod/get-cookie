import { describe, expect, test } from "@jest/globals";

import {
  CookieDomainSchema,
  CookieNameSchema,
  CookiePathSchema,
} from "../schemas";

// Domain validation tests
describe("CookieDomainSchema", () => {
  test("validates common domain formats", () => {
    const validDomains = [
      "example.com",
      ".example.com",
      "sub.example.com",
      "sub-domain.example.co.uk",
      "localhost",
      "127.0.0.1",
    ];

    validDomains.forEach((domain) => {
      expect(() => CookieDomainSchema.parse(domain)).not.toThrow();
    });
  });

  test("rejects invalid domains", () => {
    const invalidDomains = [
      "",
      " ",
      "invalid domain",
      "example..com",
      ".com",
      "example.",
      "-example.com",
      "example-.com",
    ];

    invalidDomains.forEach((domain) => {
      expect(() => CookieDomainSchema.parse(domain)).toThrow();
    });
  });
});

// Cookie name validation tests
describe("CookieNameSchema", () => {
  test("validates common cookie names", () => {
    const validNames = [
      "sessionId",
      "auth_token",
      "user-preference",
      "_ga",
      "PHPSESSID",
      "csrftoken",
      "remember_me",
      "%", // Wildcard
      "jwt.token",
      "laravel_session",
    ];

    validNames.forEach((name) => {
      expect(() => CookieNameSchema.parse(name)).not.toThrow();
    });
  });

  test("rejects invalid cookie names", () => {
    const invalidNames = [
      "",
      " ",
      "session;",
      "my cookie",
      "auth=token",
      "user@domain",
      "\x00invalid",
    ];

    invalidNames.forEach((name) => {
      expect(() => CookieNameSchema.parse(name)).toThrow();
    });
  });
});

// Path validation tests
describe("CookiePathSchema", () => {
  test("validates common path formats", () => {
    const validPaths = [
      "/",
      "/api",
      "/api/v1",
      "/path/to/resource",
      "/blog/2023/12",
      "/assets/js",
      "/~username",
      "/.well-known",
      "/api/v1/users/@me",
    ];

    validPaths.forEach((path) => {
      expect(() => CookiePathSchema.parse(path)).not.toThrow();
    });
  });

  test("rejects invalid paths", () => {
    const invalidPaths = [
      "",
      "invalid",
      "path/without/slash",
      "/path?query=1",
      "/path#fragment",
      "/path with spaces",
      "/path\\with\\backslash",
    ];

    invalidPaths.forEach((path) => {
      expect(() => CookiePathSchema.parse(path)).toThrow();
    });
  });
});
