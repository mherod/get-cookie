/**
 * Utility functions for working with buffers and binary data
 */

/**
 * Safely converts a value to a Buffer
 * @param value - The value to convert
 * @returns A Buffer containing the value
 */
export function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  // Handle TypedArrays and DataView
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }

  // Handle ArrayBuffer and SharedArrayBuffer
  if (
    value instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer !== "undefined" &&
      value instanceof SharedArrayBuffer)
  ) {
    return Buffer.from(value);
  }

  // Handle nested arrays by flattening them
  if (Array.isArray(value)) {
    const flattened = value.flat(Infinity);
    return Buffer.from(flattened);
  }

  // Handle all other types by converting to string
  return Buffer.from(String(value), "utf8");
}

/**
 * Safely converts a buffer-like value to a string, handling null/undefined cases
 * @param value - The value to convert (Buffer, string, null, or undefined)
 * @returns A string representation of the value, or empty string if null/undefined
 */
export function toString(value: Buffer | string | undefined | null): string {
  if (value === undefined || value === null) {
    return "";
  }
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
}

/**
 * Checks if a buffer contains valid UTF-8 text
 * @param buffer - The buffer to check
 * @returns true if the buffer contains valid UTF-8 text
 */
function isValidUtf8Text(buffer: Buffer): boolean {
  try {
    const text = buffer.toString("utf8");

    // Check for replacement characters (U+FFFD)
    if (text.includes("\uFFFD")) {
      return false;
    }

    // Check if all characters are printable or common whitespace
    return !text.split("").some((char) => {
      const code = char.charCodeAt(0);
      // Allow ASCII printable range (32-126), tabs, newlines, carriage returns
      return (
        (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127
      );
    });
  } catch {
    return false;
  }
}

/**
 * Attempts to decode a buffer to a string, with fallback options
 * @param buffer - The buffer to decode
 * @returns The decoded string
 */
export function decodeBuffer(buffer: Buffer): string {
  // If it's valid UTF-8 text, return it as text
  if (isValidUtf8Text(buffer)) {
    return buffer.toString("utf8");
  }

  // Otherwise, return as hex
  return buffer.toString("hex");
}
