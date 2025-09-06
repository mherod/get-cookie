/**
 * Unified SQL query builder for cookie database operations
 * Provides a centralized, type-safe way to build SQL queries for different browsers
 */

import type { SqlCookieQueryOptions } from "../../../types/schemas";

/**
 * Browser types that use SQL databases for cookie storage
 */
export type SqlBrowserType =
  | "chrome"
  | "chromium"
  | "edge"
  | "firefox"
  | "opera"
  | "brave"
  | "arc";

/**
 * SQL query configuration
 */
export interface SqlQueryConfig {
  sql: string;
  params: unknown[];
  description?: string;
}

/**
 * Cookie query options - re-export from schemas for backward compatibility
 */
export type CookieQueryOptions = SqlCookieQueryOptions;

/**
 * Database schema information
 */
interface BrowserSchema {
  tableName: string;
  nameColumn: string;
  valueColumn: string;
  domainColumn: string;
  expiryColumn: string;
  encryptedValueColumn?: string;
  pathColumn?: string;
  secureColumn?: string;
  httpOnlyColumn?: string;
}

/**
 * Browser-specific SQL schemas
 */
const BROWSER_SCHEMAS: Record<SqlBrowserType, BrowserSchema> = {
  chrome: {
    tableName: "cookies",
    nameColumn: "name",
    valueColumn: "value",
    domainColumn: "host_key",
    expiryColumn: "expires_utc",
    encryptedValueColumn: "encrypted_value",
    pathColumn: "path",
    secureColumn: "is_secure",
    httpOnlyColumn: "is_httponly",
  },
  chromium: {
    tableName: "cookies",
    nameColumn: "name",
    valueColumn: "value",
    domainColumn: "host_key",
    expiryColumn: "expires_utc",
    encryptedValueColumn: "encrypted_value",
    pathColumn: "path",
    secureColumn: "is_secure",
    httpOnlyColumn: "is_httponly",
  },
  edge: {
    tableName: "cookies",
    nameColumn: "name",
    valueColumn: "value",
    domainColumn: "host_key",
    expiryColumn: "expires_utc",
    encryptedValueColumn: "encrypted_value",
    pathColumn: "path",
    secureColumn: "is_secure",
    httpOnlyColumn: "is_httponly",
  },
  opera: {
    tableName: "cookies",
    nameColumn: "name",
    valueColumn: "value",
    domainColumn: "host_key",
    expiryColumn: "expires_utc",
    encryptedValueColumn: "encrypted_value",
    pathColumn: "path",
    secureColumn: "is_secure",
    httpOnlyColumn: "is_httponly",
  },
  brave: {
    tableName: "cookies",
    nameColumn: "name",
    valueColumn: "value",
    domainColumn: "host_key",
    expiryColumn: "expires_utc",
    encryptedValueColumn: "encrypted_value",
    pathColumn: "path",
    secureColumn: "is_secure",
    httpOnlyColumn: "is_httponly",
  },
  arc: {
    tableName: "cookies",
    nameColumn: "name",
    valueColumn: "value",
    domainColumn: "host_key",
    expiryColumn: "expires_utc",
    encryptedValueColumn: "encrypted_value",
    pathColumn: "path",
    secureColumn: "is_secure",
    httpOnlyColumn: "is_httponly",
  },
  firefox: {
    tableName: "moz_cookies",
    nameColumn: "name",
    valueColumn: "value",
    domainColumn: "host",
    expiryColumn: "expiry",
    pathColumn: "path",
    secureColumn: "isSecure",
    httpOnlyColumn: "isHttpOnly",
  },
};

/**
 * SQL query builder for cookie operations
 */
export class CookieQueryBuilder {
  private readonly schema: BrowserSchema;
  private readonly browser: SqlBrowserType;

  constructor(browser: SqlBrowserType) {
    this.browser = browser;
    this.schema = BROWSER_SCHEMAS[browser];
    if (!this.schema) {
      throw new Error(`Unsupported browser type: ${browser}`);
    }
  }

  /**
   * Build a SELECT query for cookies
   */
  buildSelectQuery(options: CookieQueryOptions): SqlQueryConfig {
    const { name, domain, exactDomain, limit, includeExpired } = options;
    const schema = this.schema;

    // Build SELECT clause based on browser type
    const selectColumns = this.buildSelectColumns();

    // Build WHERE clause
    const { whereClause, params } = this.buildWhereClause(
      name,
      domain,
      exactDomain,
      includeExpired,
    );

    // Build complete SQL
    let sql = `SELECT ${selectColumns} FROM ${schema.tableName}`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }

    // Add ORDER BY for consistent results
    sql += ` ORDER BY ${schema.expiryColumn} DESC`;

    // Add LIMIT if specified
    if (limit && limit > 0) {
      sql += ` LIMIT ${limit}`;
    }

    return {
      sql,
      params,
      description: `Query ${this.browser} cookies: name=${name}, domain=${domain}`,
    };
  }

  /**
   * Build a query to get database metadata
   */
  buildMetaQuery(key: string): SqlQueryConfig {
    // Only Chromium-based browsers have meta table
    if (this.browser === "firefox") {
      throw new Error("Firefox does not have a meta table");
    }

    return {
      sql: "SELECT value FROM meta WHERE key = ?",
      params: [key],
      description: `Get metadata: ${key}`,
    };
  }

  /**
   * Build a query to check if table exists
   */
  buildTableExistsQuery(): SqlQueryConfig {
    return {
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      params: [this.schema.tableName],
      description: `Check if ${this.schema.tableName} table exists`,
    };
  }

  /**
   * Build SELECT columns based on browser
   */
  private buildSelectColumns(): string {
    const schema = this.schema;
    const columns = [
      schema.nameColumn,
      schema.domainColumn,
      schema.expiryColumn,
    ];

    // Add encrypted_value for Chromium-based browsers
    if (schema.encryptedValueColumn && this.browser !== "firefox") {
      columns.push(schema.encryptedValueColumn);
    } else {
      columns.push(schema.valueColumn);
    }

    // Add additional columns if available
    if (schema.pathColumn) {
      columns.push(schema.pathColumn);
    }
    if (schema.secureColumn) {
      columns.push(schema.secureColumn);
    }
    if (schema.httpOnlyColumn) {
      columns.push(schema.httpOnlyColumn);
    }

    // Use aliases for consistent output
    return columns
      .map((col) => {
        switch (col) {
          case schema.domainColumn:
            return `${col} AS domain`;
          case schema.expiryColumn:
            return `${col} AS expiry`;
          case schema.encryptedValueColumn:
            return `${col} AS encrypted_value`;
          case schema.valueColumn:
            return `${col} AS value`;
          case schema.nameColumn:
            return `${col} AS name`;
          case schema.pathColumn:
            return `${col} AS path`;
          case schema.secureColumn:
            return `${col} AS is_secure`;
          case schema.httpOnlyColumn:
            return `${col} AS is_httponly`;
          default:
            return col;
        }
      })
      .join(", ");
  }

  /**
   * Build WHERE clause with proper parameter binding
   */
  private buildWhereClause(
    name: string,
    domain: string,
    exactDomain?: boolean,
    includeExpired?: boolean,
  ): { whereClause: string; params: unknown[] } {
    const schema = this.schema;
    const conditions: string[] = [];
    const params: unknown[] = [];

    // Handle name condition
    if (name === "%") {
      // Wildcard - no name condition needed
    } else if (name.includes("%") || name.includes("_")) {
      // Pattern matching
      conditions.push(`${schema.nameColumn} LIKE ?`);
      params.push(name);
    } else {
      // Exact match
      conditions.push(`${schema.nameColumn} = ?`);
      params.push(name);
    }

    // Handle domain condition
    if (domain) {
      if (exactDomain) {
        conditions.push(`${schema.domainColumn} = ?`);
        params.push(domain);
      } else {
        // Optimize domain matching:
        // 1. For domains starting with ".", use suffix match (more efficient)
        // 2. For regular domains, try to match the domain and subdomains
        if (domain.startsWith(".")) {
          // Match exact suffix (e.g., ".github.com")
          conditions.push(`${schema.domainColumn} LIKE ?`);
          params.push(`%${domain}`);
        } else {
          // Match domain and all subdomains efficiently
          // This matches "github.com", ".github.com", "api.github.com", etc.
          conditions.push(
            `(${schema.domainColumn} = ? OR ${schema.domainColumn} = ? OR ${schema.domainColumn} LIKE ?)`,
          );
          params.push(domain, `.${domain}`, `%.${domain}`);
        }
      }
    }

    // Handle expiry condition
    if (!includeExpired) {
      // Firefox uses seconds, Chrome uses microseconds since 1601
      if (this.browser === "firefox") {
        // Pre-calculate the timestamp to avoid function call per row
        const nowSeconds = Math.floor(Date.now() / 1000);
        conditions.push(`${schema.expiryColumn} > ?`);
        params.push(nowSeconds);
      } else {
        // Chrome timestamp: microseconds since January 1, 1601
        // We'll let the caller handle the conversion
        conditions.push(`${schema.expiryColumn} > 0`);
      }
    }

    return {
      whereClause: conditions.join(" AND "),
      params,
    };
  }

  /**
   * Validate and sanitize query parameters
   */
  static validateQueryParams(options: CookieQueryOptions): void {
    const { name, domain, limit } = options;

    // Validate name
    if (typeof name !== "string" || name.length === 0) {
      throw new Error("Cookie name must be a non-empty string");
    }

    // Validate domain
    if (typeof domain !== "string" || domain.length === 0) {
      throw new Error("Domain must be a non-empty string");
    }

    // Prevent SQL injection attempts
    const sqlKeywords = [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "DROP",
      "CREATE",
      "ALTER",
      "--",
      ";",
    ];
    const checkString = (str: string, field: string) => {
      const upperStr = str.toUpperCase();
      for (const keyword of sqlKeywords) {
        if (upperStr.includes(keyword)) {
          throw new Error(
            `Invalid ${field}: contains SQL keyword '${keyword}'`,
          );
        }
      }
    };

    checkString(name, "name");
    checkString(domain, "domain");

    // Validate limit
    if (limit !== undefined) {
      if (!Number.isInteger(limit) || limit <= 0 || limit > 10000) {
        throw new Error("Limit must be a positive integer between 1 and 10000");
      }
    }
  }

  /**
   * Get browser type for a query builder
   */
  getBrowserType(): SqlBrowserType {
    return this.browser;
  }

  /**
   * Get schema information
   */
  getSchema(): Readonly<BrowserSchema> {
    return Object.freeze({ ...this.schema });
  }
}

/**
 * Factory function for creating query builders
 */
export function createQueryBuilder(
  browser: SqlBrowserType,
): CookieQueryBuilder {
  return new CookieQueryBuilder(browser);
}

/**
 * Check if a browser uses SQL for cookie storage
 */
export function isSqlBrowser(browser: string): browser is SqlBrowserType {
  return browser in BROWSER_SCHEMAS;
}
