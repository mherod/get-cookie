/**
 * Central export point for all types, interfaces, and schemas
 * @module types
 */

// Re-export all schemas and types from schemas.ts
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

// Re-export all error classes and type guards from errors.ts
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

// Re-export Zod utility types
export type {
  SafeParseSuccess,
  SafeParseError,
  SafeParseResult,
} from "./ZodUtils";
