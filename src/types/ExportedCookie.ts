/**
 * Interface representing a cookie that has been exported from a browser's storage
 * Contains all the essential properties of a browser cookie
 */
export interface ExportedCookie {
  /** The domain the cookie belongs to */
  domain: string;
  /** The name of the cookie */
  name: string;
  /** The value stored in the cookie */
  value: string;
  /** Optional expiry timestamp or special value */
  expiry?: number | "Infinity" | Date;
  /** Optional metadata associated with the cookie */
  meta?: Record<string, unknown>;
}

function isValidExpiry(expiry: unknown): boolean {
  return (
    expiry === undefined ||
    typeof expiry === "number" ||
    expiry === "Infinity" ||
    expiry instanceof Date
  );
}

function isValidMeta(meta: unknown): boolean {
  return meta === undefined || (typeof meta === "object" && meta !== null);
}

/**
 * Type guard to check if an object matches the ExportedCookie interface
 * @param obj - The object to check
 * @returns True if the object is a valid ExportedCookie, false otherwise
 */
export function isExportedCookie(obj: unknown): obj is ExportedCookie {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.domain === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.value === "string" &&
    isValidExpiry(candidate.expiry) &&
    isValidMeta(candidate.meta)
  );
}
