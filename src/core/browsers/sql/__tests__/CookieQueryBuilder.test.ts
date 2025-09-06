/**
 * Tests for CookieQueryBuilder
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  CookieQueryBuilder,
  createQueryBuilder,
  isSqlBrowser,
  type CookieQueryOptions,
  type SqlBrowserType,
} from "../CookieQueryBuilder";

describe("CookieQueryBuilder", () => {
  describe("constructor", () => {
    it("should create builder for supported browsers", () => {
      const browsers = [
        "chrome",
        "firefox",
        "edge",
        "opera",
        "brave",
        "arc",
        "chromium",
      ];

      for (const browser of browsers) {
        expect(
          () => new CookieQueryBuilder(browser as SqlBrowserType),
        ).not.toThrow();
      }
    });

    it("should throw for unsupported browser", () => {
      expect(
        () => new CookieQueryBuilder("safari" as unknown as SqlBrowserType),
      ).toThrow("Unsupported browser type: safari");
    });
  });

  describe("buildSelectQuery", () => {
    describe("Chrome queries", () => {
      let builder: CookieQueryBuilder;

      beforeEach(() => {
        builder = new CookieQueryBuilder("chrome");
      });

      it("should build basic cookie query", () => {
        const options: CookieQueryOptions = {
          name: "session",
          domain: "example.com",
          browser: "chrome",
        };

        const result = builder.buildSelectQuery(options);

        expect(result.sql).toContain("SELECT");
        expect(result.sql).toContain("FROM cookies");
        expect(result.sql).toContain("WHERE name = ?");
        expect(result.sql).toContain("AND host_key LIKE ?");
        expect(result.params).toEqual(["session", "%example.com%"]);
      });

      it("should handle wildcard name", () => {
        const options: CookieQueryOptions = {
          name: "%",
          domain: "example.com",
          browser: "chrome",
        };

        const result = builder.buildSelectQuery(options);

        expect(result.sql).not.toContain("name = ?");
        expect(result.sql).toContain("host_key LIKE ?");
        expect(result.params).toEqual(["%example.com%"]);
      });

      it("should handle exact domain matching", () => {
        const options: CookieQueryOptions = {
          name: "session",
          domain: "example.com",
          browser: "chrome",
          exactDomain: true,
        };

        const result = builder.buildSelectQuery(options);

        expect(result.sql).toContain("host_key = ?");
        expect(result.params).toEqual(["session", "example.com"]);
      });

      it("should add LIMIT clause when specified", () => {
        const options: CookieQueryOptions = {
          name: "session",
          domain: "example.com",
          browser: "chrome",
          limit: 10,
        };

        const result = builder.buildSelectQuery(options);

        expect(result.sql).toContain("LIMIT 10");
      });

      it("should include encrypted_value column", () => {
        const options: CookieQueryOptions = {
          name: "session",
          domain: "example.com",
          browser: "chrome",
        };

        const result = builder.buildSelectQuery(options);

        expect(result.sql).toContain("encrypted_value");
      });

      it("should add ORDER BY clause", () => {
        const options: CookieQueryOptions = {
          name: "session",
          domain: "example.com",
          browser: "chrome",
        };

        const result = builder.buildSelectQuery(options);

        expect(result.sql).toContain("ORDER BY expires_utc DESC");
      });
    });

    describe("Firefox queries", () => {
      let builder: CookieQueryBuilder;

      beforeEach(() => {
        builder = new CookieQueryBuilder("firefox");
      });

      it("should build Firefox-specific query", () => {
        const options: CookieQueryOptions = {
          name: "session",
          domain: "example.com",
          browser: "firefox",
        };

        const result = builder.buildSelectQuery(options);

        expect(result.sql).toContain("FROM moz_cookies");
        expect(result.sql).toContain("host LIKE ?");
        expect(result.sql).not.toContain("encrypted_value");
        expect(result.sql).toContain("value AS value");
      });

      it("should use Firefox column names", () => {
        const options: CookieQueryOptions = {
          name: "session",
          domain: "example.com",
          browser: "firefox",
        };

        const result = builder.buildSelectQuery(options);

        expect(result.sql).toContain("host AS domain");
        expect(result.sql).toContain("expiry AS expiry");
        expect(result.sql).toContain("isSecure AS is_secure");
        expect(result.sql).toContain("isHttpOnly AS is_httponly");
      });
    });
  });

  describe("buildMetaQuery", () => {
    it("should build meta query for Chrome", () => {
      const builder = new CookieQueryBuilder("chrome");
      const result = builder.buildMetaQuery("version");

      expect(result.sql).toBe("SELECT value FROM meta WHERE key = ?");
      expect(result.params).toEqual(["version"]);
    });

    it("should throw for Firefox meta query", () => {
      const builder = new CookieQueryBuilder("firefox");

      expect(() => builder.buildMetaQuery("version")).toThrow(
        "Firefox does not have a meta table",
      );
    });
  });

  describe("buildTableExistsQuery", () => {
    it("should build table existence check for Chrome", () => {
      const builder = new CookieQueryBuilder("chrome");
      const result = builder.buildTableExistsQuery();

      expect(result.sql).toBe(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      );
      expect(result.params).toEqual(["cookies"]);
    });

    it("should build table existence check for Firefox", () => {
      const builder = new CookieQueryBuilder("firefox");
      const result = builder.buildTableExistsQuery();

      expect(result.sql).toBe(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      );
      expect(result.params).toEqual(["moz_cookies"]);
    });
  });

  describe("validateQueryParams", () => {
    it("should validate valid parameters", () => {
      const options: CookieQueryOptions = {
        name: "session",
        domain: "example.com",
        browser: "chrome",
        limit: 100,
      };

      expect(() =>
        CookieQueryBuilder.validateQueryParams(options),
      ).not.toThrow();
    });

    it("should reject empty name", () => {
      const options: CookieQueryOptions = {
        name: "",
        domain: "example.com",
        browser: "chrome",
      };

      expect(() => CookieQueryBuilder.validateQueryParams(options)).toThrow(
        "Cookie name must be a non-empty string",
      );
    });

    it("should reject empty domain", () => {
      const options: CookieQueryOptions = {
        name: "session",
        domain: "",
        browser: "chrome",
      };

      expect(() => CookieQueryBuilder.validateQueryParams(options)).toThrow(
        "Domain must be a non-empty string",
      );
    });

    it("should reject SQL injection attempts in name", () => {
      const options: CookieQueryOptions = {
        name: "session'; DROP TABLE cookies; --",
        domain: "example.com",
        browser: "chrome",
      };

      expect(() => CookieQueryBuilder.validateQueryParams(options)).toThrow(
        /Invalid name: contains SQL keyword/,
      );
    });

    it("should reject SQL injection attempts in domain", () => {
      const options: CookieQueryOptions = {
        name: "session",
        domain: "example.com'; DELETE FROM cookies; --",
        browser: "chrome",
      };

      expect(() => CookieQueryBuilder.validateQueryParams(options)).toThrow(
        /Invalid domain: contains SQL keyword/,
      );
    });

    it("should reject invalid limit values", () => {
      const invalidLimits = [
        0,
        -1,
        10001,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
      ];

      for (const limit of invalidLimits) {
        const options: CookieQueryOptions = {
          name: "session",
          domain: "example.com",
          browser: "chrome",
          limit,
        };

        expect(() => CookieQueryBuilder.validateQueryParams(options)).toThrow(
          "Limit must be a positive integer between 1 and 10000",
        );
      }
    });

    it("should accept valid limit values", () => {
      const validLimits = [1, 10, 100, 1000, 10000];

      for (const limit of validLimits) {
        const options: CookieQueryOptions = {
          name: "session",
          domain: "example.com",
          browser: "chrome",
          limit,
        };

        expect(() =>
          CookieQueryBuilder.validateQueryParams(options),
        ).not.toThrow();
      }
    });
  });

  describe("helper functions", () => {
    it("should identify SQL browsers correctly", () => {
      expect(isSqlBrowser("chrome")).toBe(true);
      expect(isSqlBrowser("firefox")).toBe(true);
      expect(isSqlBrowser("edge")).toBe(true);
      expect(isSqlBrowser("opera")).toBe(true);
      expect(isSqlBrowser("brave")).toBe(true);
      expect(isSqlBrowser("arc")).toBe(true);
      expect(isSqlBrowser("chromium")).toBe(true);
      expect(isSqlBrowser("safari")).toBe(false);
      expect(isSqlBrowser("unknown")).toBe(false);
    });

    it("should create query builder via factory", () => {
      const builder = createQueryBuilder("chrome");

      expect(builder).toBeInstanceOf(CookieQueryBuilder);
      expect(builder.getBrowserType()).toBe("chrome");
    });
  });

  describe("getSchema", () => {
    it("should return frozen schema object", () => {
      const builder = new CookieQueryBuilder("chrome");
      const schema = builder.getSchema();

      expect(schema.tableName).toBe("cookies");
      expect(Object.isFrozen(schema)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle pattern matching in name", () => {
      const builder = new CookieQueryBuilder("chrome");
      const options: CookieQueryOptions = {
        name: "session%",
        domain: "example.com",
        browser: "chrome",
      };

      const result = builder.buildSelectQuery(options);

      expect(result.sql).toContain("name LIKE ?");
      expect(result.params).toEqual(["session%", "%example.com%"]);
    });

    it("should handle underscore wildcard in name", () => {
      const builder = new CookieQueryBuilder("chrome");
      const options: CookieQueryOptions = {
        name: "session_id",
        domain: "example.com",
        browser: "chrome",
      };

      const result = builder.buildSelectQuery(options);

      expect(result.sql).toContain("name LIKE ?");
      expect(result.params).toEqual(["session_id", "%example.com%"]);
    });

    it("should handle includeExpired option", () => {
      const builder = new CookieQueryBuilder("chrome");
      const options: CookieQueryOptions = {
        name: "session",
        domain: "example.com",
        browser: "chrome",
        includeExpired: true,
      };

      const result = builder.buildSelectQuery(options);

      expect(result.sql).not.toContain("expires_utc > 0");
    });
  });
});
