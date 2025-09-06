/**
 * Chrome date conversion utilities
 *
 * Chrome/Chromium stores timestamps as microseconds since 1601-01-01 00:00:00 UTC
 * JavaScript Date uses milliseconds since 1970-01-01 00:00:00 UTC
 */

/**
 * The number of seconds between Chrome epoch (1601-01-01) and Unix epoch (1970-01-01)
 * This is 369 years worth of seconds
 */
export const CHROME_EPOCH_OFFSET_SECONDS = 11644473600;

/**
 * Microseconds per second
 */
export const MICROSECONDS_PER_SECOND = 1000000;

/**
 * Milliseconds per second
 */
export const MILLISECONDS_PER_SECOND = 1000;

/**
 * Converts a Chrome timestamp to a JavaScript Date object
 * @param chromeTimestamp - Microseconds since 1601-01-01 00:00:00 UTC
 * @returns JavaScript Date object or "Infinity" for session cookies, undefined for null/undefined
 */
export function chromeTimestampToDate(
  chromeTimestamp: number | undefined | null,
): Date | "Infinity" | undefined {
  // Handle null or undefined
  if (chromeTimestamp === null || chromeTimestamp === undefined) {
    return undefined;
  }

  // Handle invalid numbers
  if (typeof chromeTimestamp !== "number" || Number.isNaN(chromeTimestamp)) {
    return undefined;
  }

  // Chrome uses 0 for session cookies
  if (chromeTimestamp <= 0) {
    return "Infinity";
  }

  // Convert Chrome timestamp to Unix timestamp
  const unixTimestampSeconds =
    chromeTimestamp / MICROSECONDS_PER_SECOND - CHROME_EPOCH_OFFSET_SECONDS;

  // Sanity check: Unix timestamp should be positive and reasonable
  // Max date: year 3000 (32503680000 seconds since Unix epoch)
  if (unixTimestampSeconds < 0 || unixTimestampSeconds > 32503680000) {
    // Treat unreasonable dates as session cookies
    return "Infinity";
  }

  // Convert to milliseconds for JavaScript Date
  return new Date(unixTimestampSeconds * MILLISECONDS_PER_SECOND);
}

/**
 * Converts a JavaScript Date to a Chrome timestamp
 * @param date - JavaScript Date object
 * @returns Microseconds since 1601-01-01 00:00:00 UTC
 */
export function dateToChromeTimestamp(date: Date): number {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 0; // Session cookie
  }

  // Get Unix timestamp in seconds
  const unixTimestampSeconds = date.getTime() / MILLISECONDS_PER_SECOND;

  // Convert to Chrome timestamp
  const chromeTimestampSeconds =
    unixTimestampSeconds + CHROME_EPOCH_OFFSET_SECONDS;

  // Convert to microseconds
  return chromeTimestampSeconds * MICROSECONDS_PER_SECOND;
}

/**
 * Checks if a Chrome timestamp represents a session cookie
 * @param chromeTimestamp - Microseconds since 1601-01-01 00:00:00 UTC
 * @returns True if this is a session cookie (no expiry)
 */
export function isChromeSessionCookie(
  chromeTimestamp: number | undefined | null,
): boolean {
  return (
    chromeTimestamp === null ||
    chromeTimestamp === undefined ||
    chromeTimestamp === 0 ||
    (typeof chromeTimestamp === "number" && chromeTimestamp <= 0) ||
    // Far future dates (like year 4000) are treated as session cookies by Chrome
    (typeof chromeTimestamp === "number" &&
      chromeTimestamp >= 64092211200 * MICROSECONDS_PER_SECOND)
  );
}

/**
 * Formats a Chrome timestamp for display
 * @param chromeTimestamp - Microseconds since 1601-01-01 00:00:00 UTC
 * @returns Human-readable string representation
 */
export function formatChromeTimestamp(
  chromeTimestamp: number | undefined | null,
): string {
  if (isChromeSessionCookie(chromeTimestamp)) {
    return "Session";
  }

  const date = chromeTimestampToDate(chromeTimestamp);

  if (date === undefined) {
    return "Session";
  }

  if (date === "Infinity") {
    return "Session";
  }

  return date.toISOString();
}
