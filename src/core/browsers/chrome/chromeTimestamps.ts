/**
 * Chrome's epoch (1601-01-01T00:00:00Z) in milliseconds before Unix epoch (1970-01-01T00:00:00Z)
 */
const CHROME_EPOCH_DELTA_MS = 11644473600000;

/**
 * Maximum valid date that Chrome can store (year 9999)
 */
const MAX_VALID_TIME_MS = 253402300799999;

/**
 * Converts a Chrome timestamp to a Date
 * Chrome stores dates as microseconds since 1601-01-01T00:00:00Z
 * @param microseconds - The timestamp in microseconds since 1601
 * @returns A Date object, or null if the timestamp is invalid
 */
export function chromeTimestampToDate(microseconds: number): Date | null {
  // Basic validation
  if (!Number.isFinite(microseconds) || microseconds < 0) {
    return null;
  }

  // Convert to milliseconds with proper rounding
  const milliseconds = Math.round(microseconds / 1000);

  // Convert to Unix timestamp
  const unixTimestampMs = milliseconds - CHROME_EPOCH_DELTA_MS;

  // Validate the resulting timestamp
  if (
    unixTimestampMs > MAX_VALID_TIME_MS ||
    unixTimestampMs < -CHROME_EPOCH_DELTA_MS
  ) {
    return null;
  }

  return new Date(unixTimestampMs);
}

/**
 * Converts a Date object to Chrome timestamp
 * @param date - The Date object to convert
 * @returns The timestamp in microseconds since Chrome epoch, or null if invalid
 */
export function dateToChromeMicroseconds(date: Date): number | null {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }

  const unixTimestampMs = date.getTime();

  // Validate the timestamp is within reasonable bounds
  if (unixTimestampMs > MAX_VALID_TIME_MS) {
    return null;
  }

  return (unixTimestampMs + CHROME_EPOCH_DELTA_MS) * 1000;
}
