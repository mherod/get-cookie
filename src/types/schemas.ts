import destr from "destr";
import { z } from "zod";

/**
 * Zod schema for Mac date validation.
 * Validates that a number represents a valid Mac date (seconds since 2001-01-01).
 * @example
 * ```typescript
 * // Valid dates
 * MacDateSchema.parse(0);              // OK - Mac epoch (2001-01-01)
 * MacDateSchema.parse(3124137600);     // OK - 2100-01-01
 *
 * // Invalid dates
 * MacDateSchema.parse(-1);             // Error: Date must be after Mac epoch (2001-01-01)
 * MacDateSchema.parse(3124137601);     // Error: Date must be before 2100-01-01
 * MacDateSchema.parse("not a number"); // Error: Expected number, received string
 * ```
 */
export const MacDateSchema = z
  .number()
  .int("Mac date must be an integer")
  .min(0, "Date must be after Mac epoch (2001-01-01)")
  .max(3124137600, "Date must be before 2100-01-01");

/**
 * Schema for validating Chrome-specific dates.
 * Chrome stores dates as microseconds since 1601-01-01T00:00:00Z.
 * @example
 * ```typescript
 * // Valid Chrome dates
 * ChromeDateSchema.parse(13303830968000000); // OK - converts to Date object
 * ChromeDateSchema.parse(0);                 // OK - converts to 1601-01-01
 *
 * // Invalid Chrome dates
 * ChromeDateSchema.parse(-1);                // Error: Must be positive
 * ChromeDateSchema.parse(1.5);               // Error: Must be integer
 * ```
 */
export const ChromeDateSchema = z
  .number()
  .int()
  .nonnegative()
  .transform((microseconds) => {
    // Chrome epoch is 1601-01-01T00:00:00Z
    // First convert microseconds to milliseconds
    const milliseconds = Math.floor(microseconds / 1000);
    // Then adjust for the difference between Chrome epoch and Unix epoch
    // Unix epoch (1970) is 11644473600 seconds after Chrome epoch (1601)
    const unixTimestamp = milliseconds - 11644473600000;
    return new Date(unixTimestamp);
  });

/**
 * Type representing a Chrome date in microseconds since 1601-01-01.
 */
export type ChromeDate = z.infer<typeof ChromeDateSchema>;

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
  .refine((domain) => {
    if (
      domain === "localhost" ||
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(domain)
    ) {
      return true;
    }
    return /^\.?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
      domain,
    );
  }, "Invalid domain format");

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
  .refine((name) => {
    if (name === "%") {
      return true;
    }
    return /^[!#$%&'()*+\-.:0-9A-Z\^_`a-z|~]+$/.test(name);
  }, "Invalid cookie name format - must contain only valid characters (letters, numbers, and certain symbols) or be '%' for wildcard");

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
 * Zod schema for cookie value validation.
 * Attempts to parse JSON values using destr for better readability and type safety.
 * The schema first trims the string value, then attempts to parse it as JSON using destr.
 * If the value is valid JSON, it will be parsed into its corresponding JavaScript type.
 * @example
 * ```typescript
 * // Valid values
 * CookieValueSchema.parse("123");           // OK - Number 123
 * CookieValueSchema.parse("true");          // OK - Boolean true
 * CookieValueSchema.parse('"hello"');       // OK - String "hello"
 * CookieValueSchema.parse('{"a":1}');       // OK - Object { a: 1 }
 * CookieValueSchema.parse("[1,2,3]");       // OK - Array [1, 2, 3]
 *
 * // Raw strings remain as strings
 * CookieValueSchema.parse("abc123");        // OK - String "abc123"
 * CookieValueSchema.parse(" abc ");         // OK - String "abc" (trimmed)
 * ```
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
 * Schema for metadata about a cookie.
 * Contains additional information about the cookie's source and security settings.
 * @property file - The file path where the cookie was stored
 * @property browser - The browser name that stored the cookie (e.g., "Chrome", "Safari")
 * @property decrypted - Whether the cookie value has been decrypted
 * @property secure - Whether the cookie is only transmitted over HTTPS
 * @property httpOnly - Whether the cookie is inaccessible to JavaScript
 * @property path - The cookie's path attribute
 * @example
 * ```typescript
 * // Basic metadata
 * const meta = {
 *   file: "/Users/me/Library/Cookies/Cookies.binarycookies",
 *   browser: "Safari",
 *   secure: true,
 *   httpOnly: false
 * };
 * const result = CookieMetaSchema.parse(meta);
 *
 * // Partial metadata (all fields are optional)
 * const partialMeta = {
 *   browser: "Chrome",
 *   decrypted: true
 * };
 * CookieMetaSchema.parse(partialMeta); // OK
 * ```
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
 * Schema for validating cookie expiry dates.
 * Accepts dates in various formats: "Infinity", Date objects, timestamps, or undefined.
 * @example
 * ```typescript
 * // Valid dates
 * ExportedCookieDateSchema.parse("Infinity");     // OK - Never expires
 * ExportedCookieDateSchema.parse(new Date());     // OK - Date object
 * ExportedCookieDateSchema.parse(1735689600000);  // OK - Unix timestamp
 *
 * // Invalid dates
 * ExportedCookieDateSchema.parse(-1);             // Error: Expiry must be a positive number
 * ExportedCookieDateSchema.parse("invalid");      // Error: Invalid date format
 * ```
 */
export const ExportedCookieDateSchema = z.union([
  z.literal("Infinity"),
  z.instanceof(Date),
  z
    .number()
    .int()
    .positive()
    .transform((ms) => new Date(ms)),
]);

/**
 * Type definition for exported cookie date
 */
export type ExportedCookieDate = z.infer<typeof ExportedCookieDateSchema>;

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
    expiry: ExportedCookieDateSchema.optional(),
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
 * Schema for raw cookie values that can be either strings or buffers.
 * Used when reading cookies directly from browser stores before processing.
 * @example
 * ```typescript
 * // String values
 * CookieValueBufferOrStringSchema.parse("abc123");     // OK
 * CookieValueBufferOrStringSchema.parse("");           // OK
 *
 * // Buffer values
 * CookieValueBufferOrStringSchema.parse(Buffer.from("encrypted")); // OK
 *
 * // Invalid values
 * CookieValueBufferOrStringSchema.parse(123);          // Error: Expected string or Buffer
 * CookieValueBufferOrStringSchema.parse(null);         // Error: Expected string or Buffer
 * ```
 */
const CookieValueBufferOrStringSchema = z.union([
  z.string(),
  z.instanceof(Buffer),
]);

/**
 * Schema for raw cookie data from browser stores.
 * Represents the minimal structure of a cookie as stored in browser databases
 * before processing and transformation into the exported format.
 * @property name - The name of the cookie
 * @property value - The raw value of the cookie (can be string or buffer)
 * @property domain - The domain the cookie belongs to
 * @property path - Optional cookie path
 * @property expiry - Optional expiration timestamp
 * @example
 * ```typescript
 * // Basic cookie row
 * const row = {
 *   name: "session",
 *   value: "abc123",
 *   domain: "example.com",
 *   path: "/",
 *   expiry: 1735689600
 * };
 * const result = CookieRowSchema.parse(row);
 *
 * // Minimal cookie row
 * const minimal = {
 *   name: "theme",
 *   value: Buffer.from([1, 2, 3]), // Encrypted value
 *   domain: ".example.com"
 * };
 * CookieRowSchema.parse(minimal); // OK - path and expiry are optional
 * ```
 */
export const CookieRowSchema = z.object({
  name: z.string(),
  value: CookieValueBufferOrStringSchema,
  domain: z.string(),
  path: z.string().optional(),
  expiry: z.number().optional(),
});

/**
 * Type definition for a cookie row from the database
 */
export type CookieRow = z.infer<typeof CookieRowSchema>;

/**
 * Schema for cookie rendering options.
 * Defines how cookies should be formatted when displayed or exported.
 * @property format - Optional display format:
 * - "merged": Combines cookies with same name/domain
 * - "grouped": Groups cookies by domain
 * @property separator - Optional string to use between cookie fields
 * @property showFilePaths - Optional flag to include source file paths in output
 * @example
 * ```typescript
 * // Basic render options
 * const options = {
 *   format: "grouped" as const,
 *   separator: "; ",
 *   showFilePaths: true
 * };
 * const result = RenderOptionsSchema.parse(options);
 *
 * // Minimal options
 * const minimal = {
 *   format: "merged" as const
 * };
 * RenderOptionsSchema.parse(minimal); // OK - all fields are optional
 *
 * // Invalid format
 * RenderOptionsSchema.parse({ format: "invalid" }); // Error: Invalid format
 * ```
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
 * Schema for browser names supported by the cookie query system.
 * Validates that a browser name is one of the supported values.
 * - "Chrome": Google Chrome and Chromium-based browsers
 * - "Firefox": Mozilla Firefox
 * - "Safari": Apple Safari
 * - "internal": Internal browser implementation
 * - "unknown": Browser type could not be determined
 * @example
 * ```typescript
 * // Valid browser names
 * BrowserNameSchema.parse("Chrome");    // OK
 * BrowserNameSchema.parse("Safari");    // OK
 * BrowserNameSchema.parse("Firefox");   // OK
 *
 * // Invalid browser names
 * BrowserNameSchema.parse("chrome");    // Error: Invalid browser name
 * BrowserNameSchema.parse("Opera");     // Error: Invalid browser name
 * BrowserNameSchema.parse("");          // Error: Invalid browser name
 * ```
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
      .args(z.string(), z.string(), z.string().optional())
      .returns(z.promise(z.array(ExportedCookieSchema))),
  })
  .strict();

/**
 * Schema for cookie query strategy implementation.
 * Defines the interface for querying cookies from different browser stores.
 * Each browser implementation must provide a strategy that conforms to this schema.
 * @property browserName - The name of the browser this strategy handles
 * @property queryCookies - Function to query cookies from the browser's store
 * - Parameters:
 * - name: Cookie name to query
 * - domain: Domain to query cookies from
 * - path: Optional path to filter cookies
 * - Returns: Promise resolving to array of exported cookies
 * @example
 * ```typescript
 * // Example Chrome query strategy
 * const chromeStrategy = {
 *   browserName: "Chrome" as const,
 *   queryCookies: async (name: string, domain: string, path?: string) => {
 *     // Implementation to query Chrome cookies
 *     const cookies = await queryChromeCookies(name, domain, path);
 *     return cookies;
 *   }
 * };
 *
 * // Validate the strategy
 * const result = CookieQueryStrategySchema.safeParse(chromeStrategy);
 * if (result.success) {
 *   // Use the strategy to query cookies
 *   const cookies = await result.data.queryCookies("session", "example.com");
 * }
 * ```
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
 * Interface for configuring cookie query operations.
 * Provides options to customize how cookies are queried from browser stores.
 * @template T - The type of cookie query strategy to use (defaults to CookieQueryStrategy)
 * @property strategy - The strategy implementation to use for querying cookies
 * @property limit - Optional maximum number of cookies to return
 * @property removeExpired - Optional flag to filter out expired cookies from results
 * @property store - Optional specific cookie store to query from
 * @example
 * ```typescript
 * // Basic query options
 * const options: CookieQueryOptions = {
 *   strategy: chromeStrategy,
 *   limit: 10,
 *   removeExpired: true
 * };
 *
 * // Custom strategy type
 * interface CustomStrategy extends CookieQueryStrategy {
 *   customMethod(): void;
 * }
 *
 * const customOptions: CookieQueryOptions<CustomStrategy> = {
 *   strategy: customImplementation,
 *   store: "Custom Store"
 * };
 * ```
 */
export interface CookieQueryOptions<
  T extends CookieQueryStrategy = CookieQueryStrategy,
> {
  strategy: T;
  limit?: number;
  removeExpired?: boolean;
  store?: string;
}
