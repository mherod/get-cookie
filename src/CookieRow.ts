import consola from "./logger";

/**
 * The CookieRow interface represents the structure of a cookie row object.
 */
export default interface CookieRow {
  expiry?: number;
  domain: string;
  name: string;
  value: Uint8Array | Buffer;
  meta?: Record<string, unknown>;
}

/**
 * Type guard to check if an object is a CookieRow.
 * @param obj - The object to check.
 * @returns True if the object is a CookieRow, false otherwise.
 */
export function isCookieRow(obj: any): obj is CookieRow {
  if (typeof obj !== "object" || obj === null) {
    consola.warn("Object is not an object or is null:", obj);
    return false;
  }

  const { domain, name, value } = obj as CookieRow;

  if (typeof domain !== "string") {
    consola.warn("Domain is not a string:", domain);
    return false;
  }

  if (typeof name !== "string") {
    consola.warn("Name is not a string:", name);
    return false;
  }

  if (!(value instanceof Uint8Array) && !Buffer.isBuffer(value)) {
    consola.warn("Value is not a Uint8Array or Buffer:", value);
    return false;
  }

  return true;
}
