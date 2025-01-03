/**
 * Interface representing a cookie stored in Firefox's SQLite database.
 * Maps directly to the 'moz_cookies' table structure.
 *
 * @remarks
 * - Times are stored in microseconds since epoch
 * - Boolean values are stored as integers (0 or 1)
 * - Host format follows Firefox's cookie domain rules
 *
 * @example
 * ```typescript
 * import { FirefoxCookie } from 'get-cookie';
 *
 * // Standard cookie example
 * const standardCookie: FirefoxCookie = {
 *   name: "sessionId",
 *   value: "abc123",
 *   host: "example.com",
 *   path: "/",
 *   expiry: 1735689600,  // 2024-12-31
 *   isSecure: 1,
 *   isHttpOnly: 1,
 *   creationTime: 1672531200000000,  // 2023-01-01 in microseconds
 *   lastAccessed: 1672531200000000
 * };
 *
 * // Session cookie (no expiry)
 * const sessionCookie: FirefoxCookie = {
 *   name: "temp",
 *   value: "xyz789",
 *   host: ".app.example.com",
 *   path: "/dashboard",
 *   expiry: 0,  // Session cookie
 *   isSecure: 1,
 *   isHttpOnly: 0,
 *   creationTime: Date.now() * 1000,  // Current time in microseconds
 *   lastAccessed: Date.now() * 1000
 * };
 *
 * // Subdomain cookie with specific path
 * const subdomainCookie: FirefoxCookie = {
 *   name: "preferences",
 *   value: "theme=dark",
 *   host: ".example.com",  // Matches all subdomains
 *   path: "/settings",
 *   expiry: Math.floor(Date.now() / 1000) + 86400,  // 24 hours from now
 *   isSecure: 0,
 *   isHttpOnly: 0,
 *   creationTime: Date.now() * 1000,
 *   lastAccessed: Date.now() * 1000
 * };
 * ```
 */
export interface FirefoxCookie {
  /** Name of the cookie - case-sensitive identifier */
  name: string;
  /** Value stored in the cookie - may be encrypted */
  value: string;
  /** Host/domain of the cookie - may include leading dot for subdomain matching */
  host: string;
  /** Path where the cookie is valid - must start with "/" */
  path: string;
  /** Expiry time as Unix timestamp (seconds since epoch) - 0 for session cookies */
  expiry: number;
  /** Whether the cookie requires HTTPS (1) or allows HTTP (0) */
  isSecure: number;
  /** Whether the cookie is inaccessible to JavaScript (1) or accessible (0) */
  isHttpOnly: number;
  /** Creation time in microseconds since epoch */
  creationTime: number;
  /** Last accessed time in microseconds since epoch */
  lastAccessed: number;
}

/**
 * Row transform function type for SQLite queries
 *
 * @example
 * // Define a transform function for Firefox cookies
 * const transform: RowTransform<RawFirefoxCookie> = (row) => ({
 *   name: row.name,
 *   value: row.value,
 *   domain: row.host,
 *   expiry: new Date(row.expiry * 1000),
 *   meta: {
 *     file: '/path/to/cookies.sqlite',
 *     browser: 'Firefox',
 *     decrypted: true
 *   }
 * });
 *
 * // Use the transform function
 * const rawCookie: RawFirefoxCookie = {
 *   name: 'session',
 *   value: 'abc123',
 *   host: '.example.com',
 *   path: '/',
 *   expiry: 1735689600,
 *   isSecure: 1,
 *   isHttpOnly: 1,
 *   creationTime: 1672531200000000,
 *   lastAccessed: 1672531200000000
 * };
 * const transformed = transform(rawCookie);
 */
export type RowTransform<T> = (row: T) => {
  name: string;
  value: string;
  domain: string;
  expiry: Date;
  meta: {
    file: string;
    browser: string;
    decrypted: boolean;
  };
};
