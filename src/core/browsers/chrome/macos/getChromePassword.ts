import { execSimple } from "../../../../utils/execSimple";

/**
 * Gets the Chrome password from the keychain
 * @returns The password
 */
export async function getChromePassword(): Promise<string> {
  const command = 'security find-generic-password -w -s "Chrome Safe Storage"';
  const result = await execSimple(command);
  return result.stdout.trim();
}
