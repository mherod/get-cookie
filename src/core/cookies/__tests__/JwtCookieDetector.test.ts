import { describe, it, expect } from "@jest/globals";
import type { ExportedCookie } from "../../../types/schemas";
import {
  detectJwtCookies,
  filterJwtCookies,
  groupCookiesByJwtStatus,
} from "../JwtCookieDetector";

describe("JwtCookieDetector", () => {
  // Valid JWT token (HS256, secret: "test-secret")
  const validJwtToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Vg30C57s3l90JNap_VgMhKZjfc-p7SoBXaSAy8c6BS8";

  // Expired JWT token
  const expiredJwtToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ";

  // Invalid signature JWT (valid format but wrong signature)
  const invalidSignatureJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  const mockCookies: ExportedCookie[] = [
    {
      name: "auth_token",
      domain: "example.com",
      value: validJwtToken,
      meta: {
        browser: "chrome",
      },
    },
    {
      name: "expired_token",
      domain: "example.com",
      value: expiredJwtToken,
      meta: {
        browser: "chrome",
      },
    },
    {
      name: "session_id",
      domain: "example.com",
      value: "abc123def456",
      meta: {
        browser: "chrome",
      },
    },
    {
      name: "invalid_jwt",
      domain: "example.com",
      value: invalidSignatureJwt,
      meta: {
        browser: "chrome",
      },
    },
  ];

  describe("detectJwtCookies", () => {
    it("should detect JWT cookies and mark them with isJwt flag", () => {
      const result = detectJwtCookies(mockCookies);

      const authToken = result.find((c) => c.name === "auth_token");
      expect(authToken?.meta?.isJwt).toBe(true);

      const sessionId = result.find((c) => c.name === "session_id");
      expect(sessionId?.meta?.isJwt).toBeUndefined();
    });

    it("should decode JWT claims when decodeClaims is true", () => {
      const result = detectJwtCookies(mockCookies, { decodeClaims: true });

      const authToken = result.find((c) => c.name === "auth_token");
      expect(authToken?.meta?.jwtPayload).toBeDefined();
      expect(authToken?.meta?.jwtSubject).toBe("1234567890");
      expect(authToken?.meta?.jwtPayload?.name).toBe("John Doe");
    });

    it("should detect expired JWTs when checkExpiration is true", () => {
      const result = detectJwtCookies(mockCookies, {
        decodeClaims: true,
        checkExpiration: true,
      });

      const expiredToken = result.find((c) => c.name === "expired_token");
      expect(expiredToken?.meta?.isJwt).toBe(true);
      expect(expiredToken?.meta?.jwtValidation?.isValid).toBe(false);
      expect(expiredToken?.meta?.jwtValidation?.error).toContain("expired");
    });

    it("should validate signature when secretKey is provided", () => {
      const result = detectJwtCookies(mockCookies, {
        validateSignature: true,
        secretKey: "test-secret",
      });

      const validToken = result.find((c) => c.name === "auth_token");
      expect(validToken?.meta?.jwtValidation?.isValid).toBe(false); // Wrong secret

      const invalidToken = result.find((c) => c.name === "invalid_jwt");
      expect(invalidToken?.meta?.jwtValidation?.isValid).toBe(false);
      expect(invalidToken?.meta?.jwtValidation?.error).toBeDefined();
    });

    it("should extract JWT expiry date", () => {
      const result = detectJwtCookies(mockCookies, { decodeClaims: true });

      const authToken = result.find((c) => c.name === "auth_token");
      expect(authToken?.meta?.jwtExpiry).toBeInstanceOf(Date);
      expect(authToken?.meta?.jwtExpiry?.getTime()).toBe(9999999999000);
    });
  });

  describe("filterJwtCookies", () => {
    it("should return only cookies containing valid JWTs", () => {
      const result = filterJwtCookies(mockCookies, {
        checkExpiration: false,
      });

      expect(result).toHaveLength(3); // auth_token, expired_token (not checking exp), invalid_jwt
      expect(result.every((c) => c.meta?.isJwt)).toBe(true);
    });

    it("should exclude expired JWTs when checkExpiration is true", () => {
      const result = filterJwtCookies(mockCookies, {
        checkExpiration: true,
      });

      // Should include auth_token and invalid_jwt, but not expired_token
      const names = result.map((c) => c.name);
      expect(names).toContain("auth_token");
      expect(names).not.toContain("expired_token");
    });

    it("should exclude invalid signatures when validateSignature is true", () => {
      const result = filterJwtCookies(mockCookies, {
        validateSignature: true,
        secretKey: "test-secret",
      });

      // Should exclude all since none have valid signature with "test-secret"
      expect(result).toHaveLength(0);
    });
  });

  describe("groupCookiesByJwtStatus", () => {
    it("should group cookies into valid JWTs, invalid JWTs, and non-JWTs", () => {
      const result = groupCookiesByJwtStatus(mockCookies, {
        checkExpiration: true,
      });

      expect(result.validJwts).toHaveLength(2); // auth_token, invalid_jwt (both decode ok)
      expect(result.invalidJwts).toHaveLength(1); // expired_token (expired)
      expect(result.nonJwts).toHaveLength(1); // session_id
    });

    it("should consider all JWTs valid when not checking expiration", () => {
      const result = groupCookiesByJwtStatus(mockCookies, {
        checkExpiration: false,
      });

      expect(result.validJwts).toHaveLength(3); // auth_token, expired_token, invalid_jwt
      expect(result.invalidJwts).toHaveLength(0);
      expect(result.nonJwts).toHaveLength(1); // session_id
    });

    it("should validate signatures when secretKey is provided", () => {
      const result = groupCookiesByJwtStatus(mockCookies, {
        validateSignature: true,
        secretKey: "test-secret",
        checkExpiration: false,
      });

      expect(result.validJwts).toHaveLength(0); // None have valid signatures with "test-secret"
      expect(result.invalidJwts).toHaveLength(3); // All JWTs have invalid signatures
      expect(result.nonJwts).toHaveLength(1); // session_id
    });
  });

  describe("Edge cases", () => {
    it("should handle empty cookie array", () => {
      const result = detectJwtCookies([]);
      expect(result).toEqual([]);
    });

    it("should handle cookies with non-string values", () => {
      const cookies: ExportedCookie[] = [
        {
          name: "binary_cookie",
          domain: "example.com",
          value: { data: "not a string" } as unknown,
        },
      ];

      const result = detectJwtCookies(cookies);
      expect(result[0]?.meta?.isJwt).toBeUndefined();
    });

    it("should handle malformed JWT-like strings", () => {
      const cookies: ExportedCookie[] = [
        {
          name: "fake_jwt",
          domain: "example.com",
          value: "abc.def.ghi", // Valid JWT format but not decodable
        },
      ];

      const result = detectJwtCookies(cookies, { decodeClaims: true });
      // Has JWT format but can't be decoded
      expect(result[0]?.meta?.isJwt).toBe(true);
      expect(result[0]?.meta?.jwtPayload).toBeUndefined();
    });

    it("should preserve existing metadata", () => {
      const cookieWithMeta: ExportedCookie = {
        name: "auth",
        domain: "example.com",
        value: validJwtToken,
        meta: {
          browser: "firefox",
          file: "/path/to/cookies",
          secure: true,
        },
      };

      const result = detectJwtCookies([cookieWithMeta], { decodeClaims: true });
      expect(result[0]?.meta?.browser).toBe("firefox");
      expect(result[0]?.meta?.file).toBe("/path/to/cookies");
      expect(result[0]?.meta?.secure).toBe(true);
      expect(result[0]?.meta?.isJwt).toBe(true);
    });
  });
});
