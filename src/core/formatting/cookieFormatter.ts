import { formatDistanceToNow, formatISO, formatRelative } from "date-fns";

import type { ExportedCookie } from "../../types/schemas";
import { CookieMetaSchema } from "../../types/schemas";
import { isJWT } from "../../utils/jwt";
import { createTaggedLogger } from "../../utils/logHelpers";

const logger = createTaggedLogger("cookieFormatter");

/**
 * Available date formatting styles
 */
export type DateFormat = "iso" | "relative" | "relative-to-now";

/**
 * Configuration options for cookie formatting
 */
export interface CookieFormatOptions {
  /** Whether to mask sensitive values */
  maskSensitive: boolean;
  /** Custom indentation (default: 2 spaces) */
  indent: number;
  /** Whether to include metadata in output */
  showMeta: boolean;
  /** Date formatting style */
  dateFormat: DateFormat;
  /** Whether to show empty/null values */
  showEmpty: boolean;
  /** Maximum length for string values before truncating */
  maxValueLength: number;
  /** Custom date formatting function */
  customDateFormatter?: (date: Date) => string;
  /** Custom value masking function */
  customValueMasker?: (value: unknown, isSecure: boolean) => string;
  /** Whether to sort metadata fields */
  sortMetaFields: boolean;
  /** Whether to include field types in output */
  showTypes: boolean;
}

/**
 * Default formatting options
 */
export const DEFAULT_FORMAT_OPTIONS: CookieFormatOptions = {
  maskSensitive: false,
  indent: 2,
  showMeta: true,
  dateFormat: "iso",
  showEmpty: false,
  maxValueLength: 100,
  sortMetaFields: false,
  showTypes: false,
};

/**
 * Handles array stringification
 * @param arr - The array to stringify
 * @param indent - Number of spaces to use for indentation
 * @returns A string representation of the array
 */
function stringifyArray(arr: unknown[], indent: number): string {
  if (arr.length === 0) {
    return "[Empty Array]";
  }
  try {
    return JSON.stringify(arr, null, indent);
  } catch {
    return `[Array(${arr.length})]`;
  }
}

/**
 * Handles object stringification
 * @param obj - The object to stringify
 * @param indent - Number of spaces to use for indentation
 * @returns A string representation of the object
 */
function stringifyObject(obj: Record<string, unknown>, indent: number): string {
  try {
    const stringified = JSON.stringify(obj, null, indent);
    return stringified === "{}" ? "[Empty Object]" : stringified;
  } catch {
    return "[Complex Object]";
  }
}

/**
 * Handles string value formatting with optional truncation
 * @param value - The string value to format
 * @param maxLength - Maximum length before truncation (undefined for no truncation)
 * @returns The formatted string, possibly truncated
 */
function formatStringValue(
  value: string,
  maxLength: number | undefined,
): string {
  if (
    typeof maxLength === "number" &&
    maxLength > 0 &&
    value.length > maxLength
  ) {
    return `${value.slice(0, maxLength)}...`;
  }
  return value;
}

/**
 * Gets the type name of a value
 * @param value - The value to get the type of
 * @returns A string representation of the value's type
 */
function getTypeName(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (value instanceof Date) {
    return "date";
  }
  return typeof value;
}

/**
 * Handles primitive value stringification
 * @param value - The primitive value to stringify
 * @returns A string representation of the primitive value
 */
function stringifyPrimitive(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "symbol") {
    return value.description ?? "[Symbol]";
  }
  if (typeof value === "function") {
    return "[Function]";
  }
  if (typeof value === "bigint") {
    return `${value}n`;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  return "[Unknown Type]";
}

/**
 * Safely stringifies a value, handling complex data types appropriately
 * @param value - The value to stringify
 * @param options - Formatting options
 * @returns A string representation of the value
 */
export function safeStringify(
  value: unknown,
  options: CookieFormatOptions = DEFAULT_FORMAT_OPTIONS,
): string {
  if (value === null || value === undefined) {
    return stringifyPrimitive(value);
  }

  if (Array.isArray(value)) {
    return stringifyArray(value, options.indent);
  }

  if (value instanceof Date) {
    return formatDate(value, options.dateFormat, options.customDateFormatter);
  }

  if (typeof value === "object") {
    return stringifyObject(value as Record<string, unknown>, options.indent);
  }

  if (typeof value === "string") {
    return formatStringValue(value, options.maxValueLength);
  }

  return stringifyPrimitive(value);
}

/**
 * Format a date value according to the specified format
 * @param date - The date to format
 * @param format - The desired format
 * @param customFormatter - Optional custom date formatter
 * @returns Formatted date string
 */
function formatDate(
  date: Date,
  format: DateFormat,
  customFormatter?: (date: Date) => string,
): string {
  if (customFormatter) {
    return customFormatter(date);
  }

  switch (format) {
    case "iso":
      return formatISO(date);
    case "relative":
      return formatRelative(date, new Date());
    case "relative-to-now":
      return formatDistanceToNow(date, { addSuffix: true });
    default:
      return date.toISOString();
  }
}

/**
 * Format a cookie's metadata field if it exists and is valid according to schema
 * @param meta - The metadata object
 * @param field - The field name to format
 * @param options - Formatting options
 * @returns Formatted string or null
 */
export function formatMetaField(
  meta: Record<string, unknown> | undefined,
  field: string,
  options: CookieFormatOptions = DEFAULT_FORMAT_OPTIONS,
): string | null {
  if (!meta) {
    return null;
  }

  const result = CookieMetaSchema.safeParse(meta);
  if (!result.success) {
    return null;
  }

  const value = result.data[field as keyof typeof result.data];
  if (value === undefined || (value === null && !options.showEmpty)) {
    return null;
  }

  const fieldDisplay = field.charAt(0).toUpperCase() + field.slice(1);
  const formattedValue = safeStringify(value, options);
  const typeInfo = options.showTypes ? ` (${getTypeName(value)})` : "";

  return `${" ".repeat(options.indent)}${fieldDisplay}${typeInfo}: ${formattedValue}`;
}

/**
 * Format cookie dates
 * @param cookie - The cookie to format dates for
 * @param options - Formatting options
 * @returns Array of formatted date strings
 */
export function formatDates(
  cookie: ExportedCookie,
  options: CookieFormatOptions = DEFAULT_FORMAT_OPTIONS,
): string[] {
  const lines: string[] = [];
  const indent = " ".repeat(options.indent);

  const creation = cookie.meta?.creation;
  if (typeof creation === "number") {
    const creationDate = new Date(creation * 1000);
    lines.push(
      `${indent}Creation: ${formatDate(creationDate, options.dateFormat, options.customDateFormatter)}`,
    );
  }

  if (cookie.expiry === "Infinity") {
    lines.push(`${indent}Expiry: Never`);
  } else if (
    typeof cookie.expiry === "number" ||
    cookie.expiry instanceof Date
  ) {
    const expiryDate = new Date(
      typeof cookie.expiry === "number" ? cookie.expiry * 1000 : cookie.expiry,
    );
    lines.push(
      `${indent}Expiry: ${formatDate(expiryDate, options.dateFormat, options.customDateFormatter)}`,
    );
  }

  return lines;
}

/**
 * Standard metadata fields that can be displayed for a cookie
 * These fields are commonly available across different browser implementations
 */
export const COOKIE_META_FIELDS = [
  "browser",
  "file",
  "decrypted",
  "secure",
  "httpOnly",
  "path",
] as const;

/**
 * Format the basic cookie information
 * @param cookie - The cookie object to format
 * @param options - Formatting options to apply
 * @returns Array of formatted strings with basic cookie information
 */
function formatBasicInfo(
  cookie: ExportedCookie,
  options: CookieFormatOptions,
): string[] {
  const indent = " ".repeat(options.indent);
  const isSecure = cookie.meta?.secure ?? false;

  const maskedValue = options.customValueMasker
    ? options.customValueMasker(cookie.value, isSecure)
    : options.maskSensitive && isSecure
      ? "[Secure Value]"
      : safeStringify(cookie.value, options);

  return [
    `Cookie: ${cookie.name}`,
    `${indent}Value: ${maskedValue}`,
    `${indent}Domain: ${cookie.domain}`,
  ];
}

/**
 * Format the metadata fields of a cookie
 * @param cookie - The cookie object to format metadata for
 * @param options - Formatting options to apply
 * @returns Array of formatted strings with cookie metadata
 */
function formatMetaFields(
  cookie: ExportedCookie,
  options: CookieFormatOptions,
): string[] {
  const lines: string[] = [];

  if (options.showMeta && cookie.meta) {
    const fields = options.sortMetaFields
      ? [...COOKIE_META_FIELDS].sort()
      : COOKIE_META_FIELDS;

    for (const field of fields) {
      const formatted = formatMetaField(cookie.meta, field, options);
      if (formatted !== null) {
        lines.push(formatted);
      }
    }
  }

  return lines;
}

/**
 * Formats cookie details into a human-readable string array
 * @param cookie - The cookie object to format
 * @param options - Formatting options
 * @returns Array of strings containing formatted cookie details
 */
export function formatCookieDetails(
  cookie: ExportedCookie,
  options: CookieFormatOptions = DEFAULT_FORMAT_OPTIONS,
): string[] {
  return [
    ...formatBasicInfo(cookie, options),
    ...formatDates(cookie, options),
    ...formatMetaFields(cookie, options),
  ];
}

/**
 * Format a cookie for display with all details
 * @param cookie - The cookie to format
 * @param options - Formatting options
 * @returns Array of formatted lines
 */
export function formatCookieVerbose(
  cookie: ExportedCookie,
  options: CookieFormatOptions = DEFAULT_FORMAT_OPTIONS,
): string[] {
  const indent = " ".repeat(options.indent);
  const isSecure = cookie.meta?.secure ?? false;

  const maskedValue = options.customValueMasker
    ? options.customValueMasker(cookie.value, isSecure)
    : options.maskSensitive && isSecure
      ? "[Secure Value]"
      : safeStringify(cookie.value, options);

  const lines = [
    "Cookie details:",
    `${indent}Name: ${cookie.name}`,
    `${indent}Domain: ${cookie.domain}`,
    `${indent}Value: ${maskedValue}`,
  ];

  return [
    ...lines,
    ...formatMetaFields(cookie, options),
    ...formatDates(cookie, options),
    "",
  ];
}

/**
 * Converts a Chrome timestamp to a Date
 * Chrome stores expiry dates as microseconds since 1601-01-01T00:00:00Z
 * @param microseconds - The timestamp in microseconds since 1601
 * @returns A Date object
 */
function chromeTimestampToDate(microseconds: number): Date {
  // Convert microseconds to milliseconds and adjust for epoch difference
  // Chrome's epoch (1601-01-01) is 11644473600000 milliseconds before Unix epoch (1970-01-01)
  const unixTimestampMs = Math.floor(microseconds / 1000) - 11644473600000;
  return new Date(unixTimestampMs);
}

/**
 * Formats an expiry date for display
 * @param expiry - The expiry date to format
 * @returns A human-readable string representation of the expiry date
 */
function formatExpiry(expiry: Date | number | "Infinity" | undefined): string {
  logger.debug("Formatting expiry:", { expiry, type: typeof expiry });

  if (expiry === undefined) {
    return "No expiry";
  }
  if (expiry === "Infinity") {
    return "Never expires";
  }
  if (expiry instanceof Date) {
    return expiry.toISOString();
  }

  try {
    // Handle Chrome's microseconds timestamp
    const date = chromeTimestampToDate(expiry);
    logger.debug("Converted date:", { date, timestamp: expiry });
    return date.toISOString();
  } catch (error) {
    logger.error("Failed to format expiry:", { error, expiry });
    return "Invalid expiry";
  }
}

/**
 * Formats a cookie for display
 * @param cookie - The cookie to format
 * @returns A formatted string representation of the cookie
 */
export function formatCookie(cookie: ExportedCookie): string {
  const browserStr = cookie.meta?.browser?.toString() ?? "Unknown";
  const profileStr = cookie.meta?.profile?.toString() ?? "Unknown";
  const jwtStatus = isJWT(cookie.value)
    ? "✅ JWT cookie"
    : "❌ Not a JWT cookie";

  return [
    `Cookie: ${cookie.name}`,
    `Domain:  ${cookie.domain}`,
    `Value:   ${cookie.value}`,
    `Expiry:  ${formatExpiry(cookie.expiry)}`,
    `Browser: ${browserStr}`,
    `Profile: ${profileStr}`,
    `Status:  ${jwtStatus}`,
    "",
  ].join("\n");
}

/**
 * Creates a summary of a collection of cookies
 * @param cookies - The cookies to summarize
 * @returns A formatted string with the summary
 */
export function createCookieSummary(cookies: ExportedCookie[]): string {
  const jwtCount = cookies.filter((c) => isJWT(c.value)).length;
  const decryptFailedCount = cookies.filter(
    (c) => c.meta?.decrypted === false,
  ).length;
  const decryptSuccessCount = cookies.filter(
    (c) => c.meta?.decrypted === true,
  ).length;

  return [
    "Summary:",
    `Total cookies:          ${cookies.length}`,
    `JWT cookies:            ${jwtCount}`,
    `Decryption failed:      ${decryptFailedCount}`,
    `Successfully decrypted: ${decryptSuccessCount}`,
  ].join("\n");
}
