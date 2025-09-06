import destr from "destr";
import { z } from "zod";

/**
 * Zod schema for cookie domain validation.
 * Enforces standard cookie domain rules.
 * @example
 * ```typescript
 * // Valid domains
 * CookieDomainSchema.parse("example.com");     // OK
 * CookieDomainSchema.parse(".example.com");    // OK - leading dot is valid
 * CookieDomainSchema.parse("sub.example.com"); // OK
 *
 * // Invalid domains
 * CookieDomainSchema.parse("");               // Error: Domain cannot be empty
 * CookieDomainSchema.parse("invalid domain"); // Error: Invalid domain format
 * ```
 */
export const CookieDomainSchema = z
  .string()
  .trim()
  .min(1, "Domain cannot be empty")
  .refine(
    (domain) =>
      /^\.?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
        domain,
      ),
    "Invalid domain format",
  );

/**
 * Zod schema for cookie name validation.
 * Enforces standard cookie name rules according to RFC 6265.
 * @example
 * ```typescript
 * // Valid names
 * CookieNameSchema.parse("session");          // OK
 * CookieNameSchema.parse("auth_token");       // OK
 * CookieNameSchema.parse("user-preference");  // OK
 *
 * // Invalid names
 * CookieNameSchema.parse("");                 // Error: Cookie name cannot be empty
 * CookieNameSchema.parse("session;");         // Error: Invalid cookie name format
 * CookieNameSchema.parse("my cookie");        // Error: Invalid cookie name format
 * ```
 */
export const CookieNameSchema = z
  .string()
  .trim()
  .min(1, "Cookie name cannot be empty")
  .refine(
    (name) => name === "%" || /^[!#$%&'()*+\-.:0-9A-Z ^_`a-z|~]+$/.test(name),
    "Invalid cookie name format - must contain only valid characters (letters, numbers, and certain symbols) or be '%' for wildcard",
  );

/**
 * Zod schema for cookie path validation.
 * Enforces standard cookie path rules according to RFC 6265.
 * @example
 * ```typescript
 * // Valid paths
 * CookiePathSchema.parse("/");              // OK
 * CookiePathSchema.parse("/api");           // OK
 * CookiePathSchema.parse("/path/to/page");  // OK
 *
 * // Invalid paths
 * CookiePathSchema.parse("");               // Error: Path cannot be empty
 * CookiePathSchema.parse("invalid");        // Error: Path must start with /
 * CookiePathSchema.parse("/path?query");    // Error: Invalid path format
 * ```
 */
export const CookiePathSchema = z
  .string()
  .trim()
  .min(1, "Path cannot be empty")
  .refine((path) => path.startsWith("/"), "Path must start with /")
  .refine(
    (path) => /^\/[!#$%&'()*+,\-./:=@\w~]*$/.test(path),
    "Invalid path format - must contain only valid URL path characters",
  )
  .default("/");

/**
 * Zod schema for cookie value.
 * Attempts to parse JSON values using destr for better readability.
 */
export const CookieValueSchema = z
  .string()
  .trim()
  .transform((value) => destr(value))
  .pipe(z.any());

/**
 * Zod schema for Safari binary cookie row.
 * Validates and enforces the structure of cookie data read from Safari's Cookies.binarycookies file.
 * @example
 * ```typescript
 * const cookieData = {
 *   name: "session",
 *   value: "abc123",
 *   domain: "example.com",
 *   path: "/",
 *   expiry: 1735689600,
 *   creation: 1672531200,
 *   flags: 0x5, // Secure + HTTPOnly
 * };
 * const validCookie = BinaryCookieRowSchema.parse(cookieData);
 * ```
 */
export const BinaryCookieRowSchema = z.object({
  name: CookieNameSchema,
  value: CookieValueSchema,
  domain: CookieDomainSchema,
  path: CookiePathSchema,
  expiry: z.number().int(),
  creation: z.number().int(),
  flags: z.number().optional(),
  version: z.number().int().optional(),
  port: z.number().int().optional(),
  comment: z.string().optional(),
  commentURL: z.string().optional(),
});

/**
 * Type representing a decoded Safari binary cookie.
 * This type is inferred from the BinaryCookieRowSchema and includes all cookie properties.
 * @property name - The name of the cookie (non-empty string)
 * @property value - The value stored in the cookie
 * @property domain - The domain the cookie belongs to (non-empty string)
 * @property path - The path where the cookie is valid (defaults to "/")
 * @property expiry - Unix timestamp when the cookie expires
 * @property creation - Unix timestamp when the cookie was created
 * @property flags - Optional bit flags (e.g., Secure, HTTPOnly)
 * @property version - Optional cookie version number
 * @property port - Optional port number restriction
 * @property comment - Optional cookie comment
 * @property commentURL - Optional URL for the cookie's comment
 */
export type BinaryCookieRow = z.infer<typeof BinaryCookieRowSchema>;

/**
 * Schema for cookie specification parameters
 * Defines the required fields for identifying a cookie
 * @example
 * ```typescript
 * // Validate a cookie specification
 * const spec = {
 *   name: 'session',
 *   domain: 'example.com'
 * };
 * const result = CookieSpecSchema.safeParse(spec);
 * if (result.success) {
 *   logger.info('Valid cookie spec:', result.data);
 * } else {
 *   logger.error('Invalid cookie spec:', result.error);
 * }
 *
 * // Invalid spec (empty name)
 * const invalidSpec = {
 *   name: '',
 *   domain: 'example.com'
 * };
 * // Throws: "Cookie name cannot be empty"
 * CookieSpecSchema.parse(invalidSpec);
 * ```
 */
export const CookieSpecSchema = z
  .object({
    name: CookieNameSchema,
    domain: CookieDomainSchema,
  })
  .strict();

/**
 * Type definition for cookie specification
 * Used for specifying which cookie to query
 * @example
 * ```typescript
 * // Basic cookie spec
 * const spec: CookieSpec = {
 *   name: 'auth',
 *   domain: 'api.example.com'
 * };
 *
 * // Use in function parameters
 * function queryCookie(spec: CookieSpec): Promise<ExportedCookie[]> {
 *   return getCookie(spec);
 * }
 *
 * // Array of specs
 * const specs: CookieSpec[] = [
 *   { name: 'session', domain: 'app.example.com' },
 *   { name: 'theme', domain: 'example.com' }
 * ];
 * ```
 */
export type CookieSpec = z.infer<typeof CookieSpecSchema>;

/**
 * Schema for metadata about a cookie
 */
export const CookieMetaSchema = z
  .object({
    file: z.string().trim().min(1, "File path cannot be empty").optional(),
    browser: z.string().trim().optional(),
    decrypted: z.boolean().optional(),
    secure: z.boolean().optional(),
    httpOnly: z.boolean().optional(),
    path: CookiePathSchema.optional(),
  })
  .catchall(z.unknown())
  .strict();

/**
 * Type definition for cookie metadata
 */
export type CookieMeta = z.infer<typeof CookieMetaSchema>;

/**
 * Schema for exported cookie data
 * Represents a cookie with all its properties and metadata
 * @example
 * ```typescript
 * // Validate an exported cookie
 * const cookie = {
 *   domain: 'example.com',
 *   name: 'session',
 *   value: 'abc123',
 *   expiry: new Date('2024-12-31'),
 *   meta: {
 *     file: '/path/to/cookies.db'
 *   }
 * };
 * const result = ExportedCookieSchema.safeParse(cookie);
 * if (result.success) {
 *   logger.info('Valid cookie:', result.data);
 * } else {
 *   logger.error('Invalid cookie:', result.error);
 * }
 *
 * // Cookie with infinite expiry
 * const infiniteCookie = {
 *   ...cookie,
 *   expiry: "Infinity"
 * };
 * ExportedCookieSchema.parse(infiniteCookie); // OK
 * ```
 */
export const ExportedCookieSchema = z
  .object({
    domain: CookieDomainSchema,
    name: CookieNameSchema,
    value: CookieValueSchema,
    expiry: z
      .union([
        z.literal("Infinity"),
        z.date(),
        z.number().int().positive("Expiry must be a positive number"),
      ])
      .optional(),
    meta: CookieMetaSchema.optional(),
  })
  .strict();

/**
 * Type definition for exported cookie data
 * Represents the structure of a cookie after it has been retrieved
 * @example
 * ```typescript
 * // Basic exported cookie
 * const cookie: ExportedCookie = {
 *   domain: 'example.com',
 *   name: 'session',
 *   value: 'abc123',
 *   expiry: new Date('2024-12-31'),
 *   meta: {
 *     file: '/path/to/cookies.db'
 *   }
 * };
 *
 * // Process exported cookies
 * function processCookies(cookies: ExportedCookie[]): string[] {
 *   return cookies.map(cookie => `${cookie.name}=${cookie.value}`);
 * }
 *
 * // Filter expired cookies
 * function filterExpired(cookies: ExportedCookie[]): ExportedCookie[] {
 *   const now = new Date();
 *   return cookies.filter(cookie =>
 *     cookie.expiry === "Infinity" ||
 *     (cookie.expiry instanceof Date && cookie.expiry > now)
 *   );
 * }
 * ```
 */
export type ExportedCookie = z.infer<typeof ExportedCookieSchema>;

/**
 * Schema for raw cookie data from browser stores
 */
export const CookieRowSchema = z
  .object({
    expiry: z.number().int().optional(),
    domain: CookieDomainSchema,
    name: CookieNameSchema,
    value: z.union([z.string(), z.instanceof(Buffer)]),
  })
  .strict();

/**
 * Type definition for raw cookie data
 */
export type CookieRow = z.infer<typeof CookieRowSchema>;

/**
 * Schema for cookie render options
 */
export const RenderOptionsSchema = z
  .object({
    format: z.enum(["merged", "grouped"]).optional(),
    separator: z.string().optional(),
    showFilePaths: z.boolean().optional(),
  })
  .strict();

/**
 * Type definition for render options
 */
export type RenderOptions = z.infer<typeof RenderOptionsSchema>;

/**
 * Schema for browser names
 */
export const BrowserNameSchema = z.enum([
  "Chrome",
  "Firefox",
  "Safari",
  "internal",
  "unknown",
]);

/**
 * Type definition for browser names
 */
export type BrowserName = z.infer<typeof BrowserNameSchema>;

/**
 * Schema for cookie query strategy
 */
export const CookieQueryStrategySchema = z
  .object({
    browserName: BrowserNameSchema,
    queryCookies: z
      .function()
      .args(
        z.string(),
        z.string(),
        z.string().optional(),
        z.boolean().optional(),
      )
      .returns(z.promise(z.array(ExportedCookieSchema))),
  })
  .strict();

/**
 * Type definition for cookie query strategy
 */
export type CookieQueryStrategy = z.infer<typeof CookieQueryStrategySchema>;

/**
 * Type representing either a single cookie specification or an array of specifications.
 * Useful when you need to query multiple cookies in a single operation.
 * @example
 * ```typescript
 * // Single cookie spec
 * const single: MultiCookieSpec = {
 *   domain: "example.com",
 *   name: "sessionId"
 * };
 *
 * // Multiple cookie specs
 * const multiple: MultiCookieSpec = [
 *   { domain: "example.com", name: "sessionId" },
 *   { domain: "api.example.com", name: "authToken" }
 * ];
 * ```
 */
export type MultiCookieSpec = CookieSpec | CookieSpec[];

/**
 * Schema for base cookie query options
 */
export const BaseCookieQueryOptionsSchema = z.object({
  /** Maximum number of cookies to return */
  limit: z.number().int().positive().optional(),
  /** Whether to remove expired cookies from results */
  removeExpired: z.boolean().optional(),
  /** Include expired cookies in results */
  includeExpired: z.boolean().optional(),
  /** Storage location override */
  store: z.string().optional(),
  /** Force query even if browser is running */
  force: z.boolean().optional(),
});

/**
 * Schema for strategy-based cookie query options
 */
export const CookieQueryOptionsSchema = BaseCookieQueryOptionsSchema.extend({
  /** Strategy to use for querying cookies */
  strategy: CookieQueryStrategySchema.optional(),
});

/**
 * Schema for SQL browser types
 */
export const SqlBrowserTypeSchema = z.enum([
  "chrome",
  "chromium",
  "edge",
  "firefox",
  "opera",
  "brave",
  "arc",
]);

/**
 * Schema for SQL-specific cookie query options
 */
export const SqlCookieQueryOptionsSchema = CookieSpecSchema.extend({
  /** Browser type for SQL queries */
  browser: SqlBrowserTypeSchema,
  /** Enable exact domain matching instead of wildcard */
  exactDomain: z.boolean().optional(),
  /** Enable case-sensitive matching */
  caseSensitive: z.boolean().optional(),
  /** Maximum number of results */
  limit: z.number().int().positive().optional(),
  /** Include expired cookies */
  includeExpired: z.boolean().optional(),
});

/**
 * Type for base cookie query options
 */
export type BaseCookieQueryOptions = z.infer<
  typeof BaseCookieQueryOptionsSchema
>;

/**
 * Type for strategy-based cookie query options
 */
export type CookieQueryOptions<
  T extends CookieQueryStrategy = CookieQueryStrategy,
> = BaseCookieQueryOptions & {
  strategy?: T;
};

/**
 * Type for SQL browser types
 */
export type SqlBrowserType = z.infer<typeof SqlBrowserTypeSchema>;

/**
 * Type for SQL-specific cookie query options
 */
export type SqlCookieQueryOptions = z.infer<typeof SqlCookieQueryOptionsSchema>;
