/**
 * Converts a Chrome timestamp to a Date
 * Chrome stores expiry dates as microseconds since 1601-01-01T00:00:00Z
 * @param microseconds - The timestamp in microseconds since 1601
 * @returns A Date object
 */
export function chromeTimestampToDate(microseconds: number): Date {
  // Convert microseconds to milliseconds and adjust for epoch difference
  // Chrome's epoch (1601-01-01) is 11644473600000 milliseconds before Unix epoch (1970-01-01)
  const unixTimestampMs = Math.floor(microseconds / 1000) - 11644473600000;
  return new Date(unixTimestampMs);
}
