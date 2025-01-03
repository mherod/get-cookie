/** Raw cookie data from Firefox's SQLite database */
export interface RawFirefoxCookie {
  /** Name of the cookie */
  name: string;
  /** Value of the cookie */
  value: string;
  /** Domain the cookie belongs to */
  domain: string;
  /** Expiry timestamp of the cookie */
  expiry: number;
}

/** Row transform function type for SQLite queries */
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
