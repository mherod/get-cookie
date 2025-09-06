/**
 * Central export point for all types, interfaces, and schemas
 * @module types
 */

/**
 * Core schemas and types for cookie operations.
 * These types define the structure of cookies, query options, and browser configurations.
 * @see {@link schemas} for detailed type definitions
 */
export {
  // Schemas
  CookieDomainSchema,
  CookieNameSchema,
  CookiePathSchema,
  CookieValueSchema,
  BinaryCookieRowSchema,
  CookieSpecSchema,
  CookieMetaSchema,
  ExportedCookieSchema,
  CookieRowSchema,
  RenderOptionsSchema,
  BrowserNameSchema,
  CookieQueryStrategySchema,
  BaseCookieQueryOptionsSchema,
  CookieQueryOptionsSchema,
  SqlBrowserTypeSchema,
  SqlCookieQueryOptionsSchema,
  // Types
  type BinaryCookieRow,
  type CookieSpec,
  type CookieMeta,
  type ExportedCookie,
  type CookieRow,
  type RenderOptions,
  type BrowserName,
  type CookieQueryStrategy,
  type MultiCookieSpec,
  type BaseCookieQueryOptions,
  type CookieQueryOptions,
  type SqlBrowserType,
  type SqlCookieQueryOptions,
} from "./schemas";

/**
 * Custom error classes and type guards for cookie extraction operations.
 * These provide specific error handling for browser locks, decryption failures, and parsing errors.
 * @see {@link errors} for error class implementations
 */
export {
  // Error classes
  CookieExtractionError,
  BrowserLockError,
  DecryptionError,
  InvalidTimestampError,
  BinaryParsingError,
  // Type guards
  isCookieExtractionError,
  isBrowserLockError,
  isDecryptionError,
  isInvalidTimestampError,
  isBinaryParsingError,
} from "./errors";

/**
 * Zod schema validation utility types.
 * These types help with runtime validation and type-safe parsing of cookie data.
 * @see {@link ZodUtils} for validation utilities
 */
export type {
  SafeParseSuccess,
  SafeParseError,
  SafeParseResult,
} from "./ZodUtils";
