/**
 * Type definition for a Chrome cookie row from the database
 */
export interface ChromeCookieRow {
  name: string;
  value: string | Buffer;
  encrypted_value: string | Buffer;
  host_key: string;
  path: string;
  expires_utc: number;
  is_secure: number;
  is_httponly: number;
  samesite: string;
}

/**
 * Type definition for decryption context
 */
export interface DecryptionContext {
  file: string;
  password: string;
}

/**
 * Type definition for Chrome cookie query
 */
export interface ChromeCookieQuery {
  name: string;
  domain: string;
  file: string;
}
