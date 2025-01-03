/**
 * Converts header arguments into a key-value record of headers. Handles single headers,
 * multiple headers in an array, or null input. Header format should be "key=value".
 *
 * @param headerArgs Array of strings, single string, or null containing header information in "key=value" format
 *
 * @returns A record object where:
 * - Keys are header names (case-sensitive)
 * - Values are the corresponding header values
 * - Returns empty object if input is null
 *
 * @example
 * // Single header
 * unpackHeaders('Content-Type=application/json')
 * // => { 'Content-Type': 'application/json' }
 *
 * // Multiple headers
 * unpackHeaders(['Accept=text/html', 'X-API-Key=abc123'])
 * // => { 'Accept': 'text/html', 'X-API-Key': 'abc123' }
 *
 * // Null input
 * unpackHeaders(null)
 * // => {}
 *
 * // Error handling
 * unpackHeaders(['InvalidHeader'])
 * // => { 'InvalidHeader': undefined }
 */
export function unpackHeaders(
  headerArgs: string[] | string | null,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (headerArgs === null) {
    return headers;
  }
  if (Array.isArray(headerArgs)) {
    for (let i = 0; i < headerArgs.length; i++) {
      const [key, value] = headerArgs[i].split("=");
      headers[key] = value;
    }
  } else {
    const [key, value] = headerArgs.split("=");
    headers[key] = value;
  }
  return headers;
}
