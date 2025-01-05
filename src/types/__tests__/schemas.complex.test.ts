import { describe, expect, test } from "@jest/globals";

import {
  CookieMetaSchema,
  CookieRowSchema,
  ExportedCookieSchema,
} from "../schemas";

describe("CookieMetaSchema", () => {
  test("validates common metadata", () => {
    const validMetas = [
      {
        file: "/Users/me/Library/Cookies/Cookies.binarycookies",
        browser: "Safari",
        secure: true,
        httpOnly: true,
        path: "/",
      },
      {
        browser: "Chrome",
        decrypted: true,
        secure: false,
      },
      {
        file: "/home/user/.config/google-chrome/Default/Cookies",
        browser: "Chrome",
        decrypted: true,
        secure: true,
        httpOnly: true,
        path: "/api",
      },
      {}, // Empty meta is valid
    ];

    validMetas.forEach((meta) => {
      expect(() => CookieMetaSchema.parse(meta)).not.toThrow();
    });
  });

  test("rejects invalid metadata", () => {
    const invalidMetas = [
      {
        file: "", // Empty file path
      },
      {
        path: "invalid", // Invalid path format
      },
      {
        secure: "yes", // Boolean expected
      },
    ];

    invalidMetas.forEach((meta) => {
      expect(() => CookieMetaSchema.parse(meta)).toThrow();
    });
  });
});

describe("CookieRowSchema", () => {
  test("validates common cookie rows", () => {
    const validRows = [
      {
        name: "session",
        value: "abc123",
        domain: "example.com",
        path: "/",
        expiry: 1735689600,
      },
      {
        name: "auth",
        value: Buffer.from("encrypted-data"),
        domain: ".api.example.com",
      },
      {
        name: "_ga",
        value: "GA1.2.1234567890.1234567890",
        domain: ".example.com",
        path: "/",
        expiry: 1735689600,
      },
    ];

    validRows.forEach((row) => {
      expect(() => CookieRowSchema.parse(row)).not.toThrow();
    });
  });
});

describe("ExportedCookieSchema", () => {
  test("validates common exported cookies", () => {
    const validCookies = [
      {
        domain: "example.com",
        name: "session",
        value: "abc123",
        expiry: new Date("2024-12-31"),
        meta: {
          file: "/path/to/cookies.db",
          browser: "Chrome",
          secure: true,
          httpOnly: true,
        },
      },
      {
        domain: ".api.example.com",
        name: "auth_token",
        value: "eyJhbGciOiJIUzI1NiJ9...",
        expiry: "Infinity",
        meta: {
          browser: "Firefox",
          secure: true,
        },
      },
      {
        domain: "localhost",
        name: "csrf",
        value: "random-token",
      },
    ];

    validCookies.forEach((cookie) => {
      expect(() => ExportedCookieSchema.parse(cookie)).not.toThrow();
    });
  });
});
