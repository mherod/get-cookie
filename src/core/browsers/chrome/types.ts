/**
 * Type definition for a Chrome cookie row from the database
 */
export interface ChromeCookieRow {
  name: string;
  value: string | Buffer;
  domain: string;
  path: string;
  expiry?: number;
}

/**
 * Type definition for decryption context
 */
export interface DecryptionContext {
  file: string;
  password: string;
}
