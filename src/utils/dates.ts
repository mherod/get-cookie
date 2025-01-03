/**
 * Constants for date conversions
 */
const MAC_EPOCH_OFFSET = 978307200; // Seconds between Unix Epoch (1970-01-01) and Mac Epoch (2001-01-01)

/**
 * Converts a Mac reference date (seconds since 2001-01-01) to a JavaScript Date object.
 * @param macDate - Number of seconds since Mac epoch (2001-01-01 00:00:00)
 * @returns JavaScript Date object
 * @example
 * ```typescript
 * const date = parseMacDate(0); // 2001-01-01T00:00:00.000Z
 * const now = parseMacDate(Date.now() / 1000 - MAC_EPOCH_OFFSET);
 * ```
 */
export function parseMacDate(macDate: number): Date {
  return new Date((macDate + MAC_EPOCH_OFFSET) * 1000);
}

/**
 * Converts a JavaScript Date object to Mac reference date (seconds since 2001-01-01).
 * @param date - JavaScript Date object
 * @returns Number of seconds since Mac epoch
 * @example
 * ```typescript
 * const macDate = toMacDate(new Date('2001-01-01T00:00:00Z')); // 0
 * const now = toMacDate(new Date());
 * ```
 */
export function toMacDate(date: Date): number {
  return Math.floor(date.getTime() / 1000) - MAC_EPOCH_OFFSET;
}

/**
 * Checks if a number represents a valid Mac date (not too far in past or future).
 * @param macDate - Number to validate as Mac date
 * @returns boolean indicating if the date is valid
 * @example
 * ```typescript
 * isValidMacDate(0); // true (2001-01-01)
 * isValidMacDate(-978307200); // false (1970-01-01, too early)
 * ```
 */
export function isValidMacDate(macDate: number): boolean {
  // Validate the date is between 2001-01-01 and 2100-01-01
  const minDate = 0; // 2001-01-01
  const maxDate = 3124137600; // 2100-01-01
  return macDate >= minDate && macDate <= maxDate;
}
