/**
 * Interface representing a cookie that has been exported from a browser's storage.
 * This is the core data structure used to represent cookies after they have been
 * retrieved from various browser storage mechanisms (Chrome, Firefox, etc.).
 * @remarks
 * - All cookies must have domain, name, and value properties.
 * - Expiry is optional and can be a Date, "Infinity", or undefined.
 * - Meta information is useful for tracking the cookie's origin and state.
 * @example
 * ```typescript
 * import { ExportedCookie } from 'get-cookie';
 *
 * // Basic cookie with required fields
 * const basicCookie: ExportedCookie = {
 *   domain: "example.com",
 *   name: "sessionId",
 *   value: "abc123"
 * };
 *
 * // Cookie with expiry and metadata
 * const detailedCookie: ExportedCookie = {
 *   domain: "api.example.com",
 *   name: "authToken",
 *   value: "xyz789",
 *   expiry: new Date("2024-12-31"),
 *   meta: {
 *     file: "Cookies.sqlite",
 *     browser: "Firefox",
 *     decrypted: true,
 *     secure: true,
 *     httpOnly: true,
 *     path: "/"
 *   }
 * };
 *
 * // Cookie with infinite expiry (session cookie)
 * const persistentCookie: ExportedCookie = {
 *   domain: "app.example.com",
 *   name: "preferences",
 *   value: "theme=dark",
 *   expiry: "Infinity"
 * };
 *
 * // Subdomain cookie example
 * const subdomainCookie: ExportedCookie = {
 *   domain: ".example.com",  // Note the leading dot for all subdomains
 *   name: "tracking",
 *   value: "user123",
 *   meta: {
 *     browser: "Chrome",
 *     decrypted: true
 *   }
 * };
 * ```
 */
export interface ExportedCookie {
  /** The domain the cookie belongs to. */
  domain: string;
  /** The name of the cookie. */
  name: string;
  /** The value of the cookie. */
  value: string;
  /** When the cookie expires (Date object, "Infinity", or undefined). */
  expiry?: Date | "Infinity";
  /** Additional metadata about the cookie. */
  meta?: {
    /** Path to the file the cookie was exported from. */
    file?: string;
    /** Browser the cookie was exported from. */
    browser?: string;
    /** Whether the cookie value was decrypted. */
    decrypted?: boolean;
    /** Any additional metadata. */
    [key: string]: unknown;
  };
}

/**
 * Validates that an object has all required string fields for an ExportedCookie.
 * @internal
 * @param obj - The object to validate.
 * @returns True if the object has all required string fields, false otherwise.
 */
function hasRequiredStringFields(obj: Record<string, unknown>): boolean {
  return (
    typeof obj.domain === "string" &&
    typeof obj.name === "string" &&
    typeof obj.value === "string"
  );
}

/**
 * Validates the expiry field format for an ExportedCookie.
 * @internal
 * @param expiry - The expiry value to validate.
 * @returns True if the expiry is in a valid format, false otherwise.
 */
function hasValidExpiry(expiry: unknown): boolean {
  return (
    expiry === undefined || expiry === "Infinity" || expiry instanceof Date
  );
}

/**
 * Validates the meta field format for an ExportedCookie.
 * @internal
 * @param meta - The meta value to validate.
 * @returns True if the meta is in a valid format, false otherwise.
 */
function hasValidMeta(meta: unknown): boolean {
  return meta === undefined || (meta !== null && typeof meta === "object");
}

/**
 * Type guard to check if an object matches the ExportedCookie interface.
 * @param obj - The object to check.
 * @returns True if the object is a valid ExportedCookie, false otherwise.
 * @example
 * ```typescript
 * import { isExportedCookie } from 'get-cookie';
 *
 * // Valid cookie
 * const validCookie = {
 *   domain: "example.com",
 *   name: "sessionId",
 *   value: "abc123",
 *   expiry: new Date()
 * };
 * console.log(isExportedCookie(validCookie)); // true
 *
 * // Invalid examples
 * console.log(isExportedCookie({
 *   domain: "example.com",
 *   name: "test"
 * })); // false - missing value
 *
 * console.log(isExportedCookie({
 *   domain: 123,
 *   name: "test",
 *   value: "abc"
 * })); // false - invalid domain type
 *
 * console.log(isExportedCookie(null)); // false
 * ```
 */
export function isExportedCookie(obj: unknown): obj is ExportedCookie {
  if (obj === null || typeof obj !== "object") {
    return false;
  }

  const candidate = obj as Record<string, unknown>;
  return (
    hasRequiredStringFields(candidate) &&
    hasValidExpiry(candidate.expiry) &&
    hasValidMeta(candidate.meta)
  );
}
