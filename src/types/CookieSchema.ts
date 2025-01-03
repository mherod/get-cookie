import { z } from "zod";

/**
 * Schema for cookie specification parameters
 * Defines the required fields for identifying a cookie
 */
export const CookieSpecSchema = z.object({
  name: z.string().trim().min(1, "Cookie name cannot be empty"),
  domain: z.string().trim().min(1, "Domain cannot be empty"),
}).strict();

/**
 * Schema for exported cookie data
 * Represents a cookie with all its properties and metadata
 */
export const ExportedCookieSchema = z.object({
  domain: z.string().trim().min(1, "Domain cannot be empty"),
  name: z.string().trim().min(1, "Cookie name cannot be empty"),
  value: z.string(),
  expiry: z.union([
    z.literal("Infinity"),
    z.date(),
    z.number().int().positive("Expiry must be a positive number")
  ]),
  meta: z.object({
    file: z.string().trim().min(1, "File path cannot be empty"),
  }).strict(),
}).strict();

/**
 * Type definition for cookie specification
 * Used for specifying which cookie to query
 */
export type CookieSpec = z.infer<typeof CookieSpecSchema>;

/**
 * Type definition for exported cookie data
 * Represents the structure of a cookie after it has been retrieved
 */
export type ExportedCookie = z.infer<typeof ExportedCookieSchema>;
