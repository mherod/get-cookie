/**
 * Checks if a string matches the basic JWT format
 * @param str - The string to check
 * @returns True if the string matches JWT format, false otherwise
 * @example
 */
export function isJWT(str: string): boolean {
  if (!str || typeof str !== "string") {
    return false;
  }

  // JWT consists of three parts separated by dots
  const parts = str.split(".");
  if (parts.length !== 3) {
    return false;
  }

  // Each part should be base64url encoded
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every((part) => base64UrlRegex.test(part));
}
