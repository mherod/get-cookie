import { decrypt } from "./decrypt";

/**
 * Decrypts a Chrome cookie value using the provided password and file path.
 * @param buffer - The encrypted cookie value as a Buffer
 * @param file - The path to the cookie file
 * @param password - The decryption password
 * @returns A promise that resolves to the decrypted cookie value as a string
 */
export async function decryptChromeCookie(
  buffer: Buffer,
  file: string,
  password: string,
): Promise<string> {
  return decrypt(buffer, password);
}
