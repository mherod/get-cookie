/**
 * Raw cookie data from Firefox's SQLite database
 *
 * @example
 * // Example cookie row from Firefox database
 * const rawCookie: RawFirefoxCookie = {
 *   name: 'session',
 *   value: 'abc123',
 *   host: '.example.com',
 *   path: '/',
 *   expiry: 1735689600, // Unix timestamp
 *   isSecure: 1,
 *   isHttpOnly: 1,
 *   creationTime: 1672531200000000,
 *   lastAccessed: 1672531200000000
 * };
 */
export interface RawFirefoxCookie {
  /** Name of the cookie */
  name: string;
  /** Value of the cookie */
  value: string;
  /** Host/domain of the cookie */
  host: string;
  /** Path where the cookie is valid */
  path: string;
  /** Expiry time as Unix timestamp */
  expiry: number;
  /** Whether the cookie is secure (1 or 0) */
  isSecure: number;
  /** Whether the cookie is HTTP only (1 or 0) */
  isHttpOnly: number;
  /** Creation time in microseconds */
  creationTime: number;
  /** Last accessed time in microseconds */
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
