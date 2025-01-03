/**
 * Converts header arguments into a key-value record of headers
 * @param headerArgs Array of strings, single string, or null containing header information in "key=value" format
 * @returns Record mapping header names to their values
 * @example
 * unpackHeaders(['Content-Type=application/json']) // returns { 'Content-Type': 'application/json' }
 * unpackHeaders('Accept=text/html') // returns { 'Accept': 'text/html' }
 * unpackHeaders(null) // returns {}
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
