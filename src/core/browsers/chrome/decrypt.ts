// External imports
import { createDecipheriv, pbkdf2 } from "crypto";

/**
 * Removes the v10 prefix from the encrypted value if present
 *
 * @param value - The encrypted value
 * @returns The value without the v10 prefix
 */
function removeV10Prefix(value: Buffer): Buffer {
  if (
    value.length >= 3 &&
    value[0] === 0x76 && // 'v'
    value[1] === 0x31 && // '1'
    value[2] === 0x30
  ) {
    // '0'
    return value.slice(3);
  }
  return value;
}

/**
 * Removes PKCS7 padding from the decrypted value
 *
 * @param decrypted - The decrypted buffer
 * @returns The buffer without padding
 */
function removePadding(decrypted: Buffer): Buffer {
  const padding = decrypted[decrypted.length - 1];
  if (padding && padding <= 16) {
    return decrypted.slice(0, -padding);
  }
  return decrypted;
}

/**
 * Extracts the actual value from the decoded string by removing Chrome's prefixes
 *
 * @param decodedString - The decoded string to clean up
 * @returns The cleaned up value
 */
function extractValue(decodedString: string): string {
  const cleanupPatterns = [
    /.*?0t(.+)$/, // Pattern ending in "0t" followed by value
    /.*?1e`(.+)$/, // Pattern ending in "1e`" followed by value
    /.*?[`'](.+)$/, // Any backtick or quote followed by value
    /[^\x20-\x7E]*([\x20-\x7E].+)$/, // Non-printable chars followed by printable chars
  ];

  for (const pattern of cleanupPatterns) {
    const match = decodedString.match(pattern);
    const value = match?.[1] ?? "";
    if (value.length > 0) {
      return value;
    }
  }
  return decodedString;
}

/**
 * Decrypts Chrome's encrypted cookie values
 *
 * @param encryptedValue - The encrypted cookie value as a Buffer
 * @param password - The Chrome encryption password
 * @returns A promise that resolves to the decrypted cookie value
 * @throws {Error} If decryption fails
 * @example
 */
export async function decrypt(
  encryptedValue: Buffer,
  password: string,
): Promise<string> {
  if (typeof password !== "string") {
    throw new Error("password must be a string");
  }
  if (!Buffer.isBuffer(encryptedValue)) {
    throw new Error("encryptedData must be a Buffer");
  }

  return new Promise((resolve, reject) => {
    pbkdf2(password, "saltysalt", 1003, 16, "sha1", (error, key) => {
      try {
        if (error) {
          reject(new Error("Failed to derive key: " + error.message));
          return;
        }

        const value = removeV10Prefix(encryptedValue);
        if (value.length % 16 !== 0) {
          reject(new Error("Encrypted data length is not a multiple of 16"));
          return;
        }

        // Chrome's encryption parameters
        const iv = Buffer.alloc(16, " "); // 16 spaces
        const decipher = createDecipheriv("aes-128-cbc", key, iv);
        decipher.setAutoPadding(false);

        // Decrypt the value
        let decrypted = decipher.update(value);
        try {
          decipher.final();
        } catch (e) {
          reject(
            new Error("Failed to finalize decryption: " + (e as Error).message),
          );
          return;
        }

        decrypted = removePadding(decrypted);
        const decodedString = decrypted.toString("utf8");
        resolve(extractValue(decodedString));
      } catch (e) {
        reject(new Error("Decryption failed: " + (e as Error).message));
      }
    });
  });
}
