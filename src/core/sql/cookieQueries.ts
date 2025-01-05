/**
 * Interface for SQL query with parameterized values
 */
export interface SqlQuery {
  sql: string;
  params: unknown[];
}

interface CookieQueryOptions {
  tableName?: string;
  domainColumn?: string;
  expiryColumn?: string;
  includeExpired?: boolean;
  additionalColumns?: string[];
}

/**
 * Builds the base SQL query for cookie retrieval
 * @param options - Query options
 * @returns Base SQL query string
 */
function buildBaseQuery(options: Required<CookieQueryOptions>): string {
  const columns = [
    "name",
    "encrypted_value",
    `${options.domainColumn} as domain`,
    `${options.expiryColumn} as expiry`,
    ...options.additionalColumns,
  ].join(", ");

  return `
    SELECT ${columns}
    FROM ${options.tableName}
    WHERE 1=1
    ${options.includeExpired ? "" : `AND ${options.expiryColumn} > (${Date.now() * 1000})`}
  `;
}

/**
 * Builds domain filtering conditions for cookie queries
 * @param domain - Domain to filter by
 * @param domainColumn - Name of the domain column
 * @returns SQL conditions and parameters
 */
function buildDomainFilter(domain: string, domainColumn: string): SqlQuery {
  return {
    sql: `${domainColumn} = ? OR ${domainColumn} LIKE ? OR ${domainColumn} LIKE ?`,
    params: [
      domain, // Exact match
      `.${domain}`, // Subdomain match
      `%.${domain}`, // Wildcard subdomain match
    ],
  };
}

/**
 * Builds a SQL query for retrieving cookies with domain and name filtering
 * @param name - Cookie name to search for (use "%" for wildcard)
 * @param domain - Domain to filter by
 * @param options - Additional query options
 * @param options.tableName - Name of the table to query (defaults to "cookies")
 * @param options.domainColumn - Name of the domain column (defaults to "host_key")
 * @param options.expiryColumn - Name of the expiry column (defaults to "expires_utc")
 * @param options.includeExpired - Whether to include expired cookies (defaults to false)
 * @param options.additionalColumns - Additional columns to select
 * @returns SQL query object with parameterized values
 */
export function buildCookieQuery(
  name: string,
  domain: string,
  options: CookieQueryOptions = {},
): SqlQuery {
  const resolvedOptions = {
    tableName: options.tableName ?? "cookies",
    domainColumn: options.domainColumn ?? "host_key",
    expiryColumn: options.expiryColumn ?? "expires_utc",
    includeExpired: options.includeExpired ?? false,
    additionalColumns: options.additionalColumns ?? [],
  };

  const baseQuery = buildBaseQuery(resolvedOptions);
  const domainFilter = buildDomainFilter(domain, resolvedOptions.domainColumn);

  if (name === "%") {
    return {
      sql: `${baseQuery} AND (${domainFilter.sql})`,
      params: domainFilter.params,
    };
  }

  return {
    sql: `${baseQuery} AND name = ? AND (${domainFilter.sql})`,
    params: [name, ...domainFilter.params],
  };
}

/**
 * Builds a SQL query for Firefox cookies
 * @param name - Cookie name to search for (use "%" for wildcard)
 * @param domain - Domain to filter by
 * @returns SQL query object with parameterized values
 */
export function buildFirefoxCookieQuery(
  name: string,
  domain: string,
): SqlQuery {
  return buildCookieQuery(name, domain, {
    tableName: "moz_cookies",
    domainColumn: "host",
    expiryColumn: "expiry",
    additionalColumns: ["value"],
  });
}

/**
 * Builds a SQL query for Chrome cookies
 * @param name - Cookie name to search for (use "%" for wildcard)
 * @param domain - Domain to filter by
 * @returns SQL query object with parameterized values
 */
export function buildChromeCookieQuery(name: string, domain: string): SqlQuery {
  return buildCookieQuery(name, domain, {
    additionalColumns: ["is_secure", "is_httponly", "path", "samesite"],
  });
}
