import { AsyncLocalStorage } from "node:async_hooks";

// Request-local options keep machine consumers from receiving display-decoded
// values without changing the existing CLI/library presentation behaviour.
const context = new AsyncLocalStorage<{ rawValues: boolean }>();

/**
 *
 */
export function usesRawCookieValues(): boolean {
  return context.getStore()?.rawValues === true;
}

/**
 *
 * @param operation
 */
export async function withRawCookieValues<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return context.run({ rawValues: true }, operation);
}
