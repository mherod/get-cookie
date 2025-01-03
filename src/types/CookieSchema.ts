import { z } from "zod";

/**
 * Schema for cookie specification parameters
 * Defines the required fields for identifying a cookie
 * @example
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
 */
export const CookieSpecSchema = z
  .object({
    name: z.string().trim().min(1, "Cookie name cannot be empty"),
    domain: z.string().trim().min(1, "Domain cannot be empty"),
  })
  .strict();

/**
 * Schema for exported cookie data
 * Represents a cookie with all its properties and metadata
 * @example
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
 */
export const ExportedCookieSchema = z
  .object({
    domain: z.string().trim().min(1, "Domain cannot be empty"),
    name: z.string().trim().min(1, "Cookie name cannot be empty"),
    value: z.string(),
    expiry: z.union([
      z.literal("Infinity"),
      z.date(),
      z.number().int().positive("Expiry must be a positive number"),
    ]),
    meta: z
      .object({
        file: z.string().trim().min(1, "File path cannot be empty"),
      })
      .strict(),
  })
  .strict();

/**
 * Type definition for cookie specification
 * Used for specifying which cookie to query
 * @example
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
 */
export type CookieSpec = z.infer<typeof CookieSpecSchema>;

/**
 * Type definition for exported cookie data
 * Represents the structure of a cookie after it has been retrieved
 * @example
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
 */
export type ExportedCookie = z.infer<typeof ExportedCookieSchema>;
