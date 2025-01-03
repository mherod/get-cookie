import { memoize } from "lodash";

import { execSimple } from "@utils/execSimple";

/**
 * Retrieves the Chrome Safe Storage password from the macOS keychain
 *
 * @returns A promise that resolves to the Chrome Safe Storage password
 * @throws {Error} If the password cannot be retrieved from the keychain
 */
const getChromeSafeStoragePassword = async (): Promise<string> => {
  const command = 'security find-generic-password -w -s "Chrome Safe Storage"';
  return execSimple(command);
};

/**
 * Memoized version of getChromeSafeStoragePassword that caches the result
 * to avoid repeated keychain queries
 *
 * @returns A promise that resolves to the Chrome Safe Storage password
 * @throws {Error} If the password cannot be retrieved from the keychain
 * @example
 */
export const getChromePassword = memoize(getChromeSafeStoragePassword);
