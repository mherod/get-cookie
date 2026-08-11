import { createCipheriv, randomBytes } from "node:crypto";

jest.mock("@utils/platformUtils", () => ({
  getPlatform: jest.fn().mockReturnValue("win32"),
  isMacOS: jest.fn().mockReturnValue(false),
  isWindows: jest.fn().mockReturnValue(true),
  isLinux: jest.fn().mockReturnValue(false),
}));

import { decrypt } from "../decrypt";
import {
  CHROME_DOMAIN_HASH_LENGTH,
  CHROME_M127_META_VERSION,
  WINDOWS_GCM_KEY_LENGTH,
} from "../windows/decryptV10Cookie";

import { TEST_COOKIES, TEST_PASSWORD } from "./fixtures/cookieFixtures";

/**
 * Builds a Chrome Windows v10 cookie blob: "v10" + 12-byte nonce + ciphertext + 16-byte tag.
 * @param plaintext - The plaintext bytes to encrypt (may include a synthetic hash prefix)
 * @param key - The 32-byte AES-256 master key
 * @returns The encrypted v10 blob
 */
function buildV10Blob(plaintext: Buffer, key: Buffer): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("v10"), nonce, ciphertext, tag]);
}

// These branches only execute when isWindows() is true, so a macOS or Linux run never
// reaches them and they are covered solely by the Windows CI matrix entry. Mocking the
// platform pins the routing rule on every OS instead: AES-256-GCM takes a 32-byte DPAPI
// master key, and anything else falls through to the PBKDF2/AES-CBC path.
describe("decrypt — Windows v10 routing", () => {
  it("falls through to the AES-CBC path for a non-32-byte password", async () => {
    // TEST_PASSWORD is a 24-byte keychain-style password, not a DPAPI master key.
    // Feeding it to AES-256-GCM throws "RangeError: Invalid key length".
    const encryptedValue = Buffer.from(TEST_COOKIES.logged_in.encrypted, "hex");

    await expect(decrypt(encryptedValue, TEST_PASSWORD)).resolves.toBe(
      TEST_COOKIES.logged_in.decrypted,
    );
  });

  it("reports a non-string password rather than a Buffer TypeError", async () => {
    // Normalizing before the type guard surfaces "The first argument must be of type
    // string..." from Buffer.from() instead of the documented validation error.
    const encryptedValue = Buffer.from(TEST_COOKIES.logged_in.encrypted, "hex");

    await expect(
      // Deliberately invalid at runtime: callers reach decrypt() via untyped SQLite rows.
      decrypt(encryptedValue, 123 as unknown as string),
    ).rejects.toThrow("password must be a string");
  });

  it("uses the GCM path when the master key arrives as a latin1 string", async () => {
    const key = randomBytes(WINDOWS_GCM_KEY_LENGTH);
    const value = "gcm_routed_value";
    const plaintext = Buffer.concat([
      randomBytes(CHROME_DOMAIN_HASH_LENGTH), // Chrome M127+ SHA-256 domain hash
      Buffer.from(value, "utf8"),
    ]);
    const blob = buildV10Blob(plaintext, key);

    // DPAPI hands the key back as latin1 — a lossless byte<->char mapping.
    await expect(
      decrypt(blob, key.toString("latin1"), CHROME_M127_META_VERSION),
    ).resolves.toBe(value);
  });

  it("uses the GCM path when the master key arrives as a Buffer", async () => {
    const key = randomBytes(WINDOWS_GCM_KEY_LENGTH);
    const value = "buffer_key_value";
    const blob = buildV10Blob(Buffer.from(value, "utf8"), key);

    await expect(
      decrypt(blob, key, CHROME_M127_META_VERSION - 1),
    ).resolves.toBe(value);
  });
});
