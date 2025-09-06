import { readFileSync } from "node:fs";
import { join } from "node:path";

import { chromeApplicationSupport } from "../ChromeApplicationSupport";

/**
 * Windows Chrome Local State file structure for encrypted key
 */
interface WindowsChromeLocalState {
  os_crypt: {
    encrypted_key: string;
  };
}

/**
 * Decrypts Windows DPAPI encrypted key using Windows CryptoAPI
 * On Windows, Chrome uses DPAPI (Data Protection API) to encrypt the master key
 * which is then used to encrypt cookies.
 * @param encryptedKey - The DPAPI encrypted key buffer
 * @returns The decrypted key as a Buffer
 * @throws {Error} If DPAPI decryption fails or key format is invalid
 */
function decryptDPAPIKey(encryptedKey: Buffer): Buffer {
  // Remove the DPAPI prefix (first 5 bytes: "DPAPI")
  const DPAPI_PREFIX = Buffer.from("DPAPI");
  if (!encryptedKey.subarray(0, 5).equals(DPAPI_PREFIX)) {
    throw new Error("Invalid DPAPI key prefix");
  }

  const encryptedData = encryptedKey.subarray(5);

  // Try to use native DPAPI if available on Windows
  if (process.platform === "win32") {
    try {
      // Use eval to prevent bundlers from analyzing the require
      // This ensures the module is loaded at runtime, not bundled
      const moduleName = "@primno" + "/dpapi"; // Split to prevent static analysis
      // biome-ignore lint/security/noGlobalEval: Required for dynamic optional dependency loading
      const dpapi = eval(`require("${moduleName}")`) as {
        unprotectData: (data: Buffer) => Buffer;
      };

      if (typeof dpapi.unprotectData === "function") {
        return dpapi.unprotectData(encryptedData);
      }
    } catch (error) {
      // Module not available or failed to load - this is expected for optional dependency
      // Don't log the full error to avoid cluttering output
      if (process.env.VERBOSE !== undefined && process.env.VERBOSE !== "") {
        console.warn("DPAPI module not available:", error);
      }
    }
  }

  // Fallback for testing or when DPAPI is not available
  // This won't work for real encrypted cookies but allows the code to run
  throw new Error(
    "Windows DPAPI decryption requires native bindings. Install @primno/dpapi package for Windows support.",
  );
}

/**
 * Retrieves the Chrome Safe Storage password on Windows
 * On Windows, Chrome stores an encrypted master key in Local State file
 * which is encrypted using Windows DPAPI (Data Protection API)
 * @returns A promise that resolves to the Chrome Safe Storage password
 * @throws {Error} If the password cannot be retrieved from Local State file
 */
export function getChromePassword(): string {
  try {
    const localStatePath = join(chromeApplicationSupport, "Local State");
    const localStateContent = readFileSync(localStatePath, "utf8");
    const localState = JSON.parse(localStateContent) as WindowsChromeLocalState;

    if (!localState.os_crypt.encrypted_key) {
      throw new Error("No encrypted key found in Chrome Local State");
    }

    // Decode the base64 encrypted key
    const encryptedKeyBuffer = Buffer.from(
      localState.os_crypt.encrypted_key,
      "base64",
    );

    // Decrypt using DPAPI
    const masterKey = decryptDPAPIKey(encryptedKeyBuffer);

    // Return the key as a buffer (not string) for use in AES-GCM decryption
    return masterKey.toString("latin1");
  } catch (error) {
    throw new Error(
      `Failed to retrieve Chrome password on Windows: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
