import { execSimple } from "../../../../utils/execSimple";

/**
 * Gets the Chrome password from the keychain
 * @param account - The account to get the password for
 * @returns The password
 */
export async function getChromePassword(account: string): Promise<string> {
  const command = `security find-generic-password -w -a "${account}" -s "Chrome Safe Storage"`;
  const result = await execSimple(command);
  return result.stdout.trim();
}
