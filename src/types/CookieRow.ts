import logger from "@utils/logger";

/**
 * Represents a raw cookie row from a browser's cookie store
 * Contains the essential properties of a cookie before processing
 *
 * @example
 */
export interface CookieRow {
  /** Optional expiry timestamp */
  expiry?: number;
  /** The domain the cookie belongs to */
  domain: string;
  /** The name of the cookie */
  name: string;
  /** The value stored in the cookie (can be encrypted) */
  value: string | Buffer;
}

/**
 * Type guard to check if an object matches the CookieRow interface
 *
 * @param obj - The object to check
 * @returns True if the object is a valid CookieRow, false otherwise
 * @example
 */
export function isCookieRow(obj: unknown): obj is CookieRow {
  if (typeof obj !== "object" || obj === null) {
    logger.warn("Object is not an object or is null:", obj);
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  const hasRequiredProps =
    typeof candidate.domain === "string" &&
    typeof candidate.name === "string" &&
    (typeof candidate.value === "string" || Buffer.isBuffer(candidate.value));

  if (!hasRequiredProps) {
    logger.warn("Object is missing required properties:", obj);
    return false;
  }

  if (candidate.expiry !== undefined && typeof candidate.expiry !== "number") {
    logger.warn("Expiry is defined but not a number:", candidate.expiry);
    return false;
  }

  return true;
}
