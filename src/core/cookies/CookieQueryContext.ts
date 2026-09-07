import { AsyncLocalStorage } from "node:async_hooks";

// Request-local options keep machine consumers from receiving display-decoded
// values without changing the existing CLI/library presentation behaviour.
const context = new AsyncLocalStorage<{ rawValues: boolean }>();

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
  return context.run({ rawValues: true }, operation);
}
