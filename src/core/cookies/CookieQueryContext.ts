import { AsyncLocalStorage } from "node:async_hooks";

export type LinuxKeyring = "basic" | "gnome" | "kwallet";

interface CookieQueryOptions {
  includeAllExpiries?: boolean;
  rawValues?: boolean;
  keyring?: LinuxKeyring;
}

const context = new AsyncLocalStorage<CookieQueryOptions>();

/** Lets callers apply expiry filtering after conversion while retaining session rows. */
export function includesAllCookieExpiries(): boolean {
  return context.getStore()?.includeAllExpiries === true;
}

/** Returns the Linux keyring override for the current cookie query. */
export function getLinuxKeyringOverride(): LinuxKeyring | undefined {
  return context.getStore()?.keyring;
}

/** Validates a CLI keyring selector before querying any browser. */
export function parseLinuxKeyring(value: unknown): LinuxKeyring | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "basic" || value === "gnome" || value === "kwallet") {
    return value;
  }
  throw new Error("--keyring must be basic, gnome or kwallet");
}

/** Runs a query with isolated options, preserving options from an outer query. */
export function withCookieQueryOptions<T>(
  options: CookieQueryOptions,
  operation: () => Promise<T>,
): Promise<T> {
  return context.run({ ...context.getStore(), ...options }, operation);
}

/**
 * Checks whether the current async context requires raw cookie values.
 * @returns True if raw cookie values should be preserved, false otherwise.
 */
export function usesRawCookieValues(): boolean {
  return context.getStore()?.rawValues === true;
}

/**
 * Executes an asynchronous operation with raw cookie values preserved.
 * @param operation - The asynchronous callback to execute within this context.
 * @returns The resolved result of the operation.
 */
export async function withRawCookieValues<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return withCookieQueryOptions({ rawValues: true }, operation);
}
