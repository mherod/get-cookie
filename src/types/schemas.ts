import { z } from "zod";

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
 *   console.log('Valid cookie spec:', result.data);
 * } else {
 *   console.error('Invalid cookie spec:', result.error);
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
    name: z.string().trim().min(1, "Cookie name cannot be empty"),
    domain: z.string().trim().min(1, "Domain cannot be empty"),
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
    path: z.string().optional(),
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
 *   console.log('Valid cookie:', result.data);
 * } else {
 *   console.error('Invalid cookie:', result.error);
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
    domain: z.string().trim().min(1, "Domain cannot be empty"),
    name: z.string().trim().min(1, "Cookie name cannot be empty"),
    value: z.string(),
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
    domain: z.string().trim().min(1, "Domain cannot be empty"),
    name: z.string().trim().min(1, "Cookie name cannot be empty"),
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
      .args(z.string(), z.string())
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
