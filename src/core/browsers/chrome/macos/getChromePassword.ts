import { execSimple } from "../../../../utils/execSimple";

/**
 * Retrieves the Chrome Safe Storage password from the macOS keychain
 * @returns A promise that resolves to the Chrome Safe Storage password
 * @throws {Error} If the password cannot be retrieved from the keychain
 */
export async function getChromePassword(): Promise<string> {
  const command = 'security find-generic-password -w -s "Chrome Safe Storage"';
  const result = await execSimple(command);
  return result.stdout.trim();
}
