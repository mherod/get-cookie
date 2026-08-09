import { createCipheriv, randomBytes } from "node:crypto";

jest.mock("@utils/platformUtils", () => ({
  getPlatform: jest.fn().mockReturnValue("win32"),
  isMacOS: jest.fn().mockReturnValue(false),
  isWindows: jest.fn().mockReturnValue(true),
  isLinux: jest.fn().mockReturnValue(false),
}));

import { decrypt } from "../decrypt";

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

// These branches only execute when isWindows() is true, so they are invisible to a
// macOS/Linux test run and only ever failed on the Windows CI matrix entry. The
// routing rule under test: AES-256-GCM requires exactly a 32-byte DPAPI master key,
// and everything else must fall through to the PBKDF2/AES-CBC path.
describe("decrypt — Windows v10 routing", () => {
  it("falls through to the AES-CBC path for a non-32-byte password", async () => {
    // TEST_PASSWORD is a 24-byte keychain-style password, not a DPAPI master key.
    // Feeding it to AES-256-GCM throws "RangeError: Invalid key length".
    const encryptedValue = Buffer.from(TEST_COOKIES.logged_in.encrypted, "hex");

    await expect(decrypt(encryptedValue, TEST_PASSWORD)).resolves.toBe(
      TEST_COOKIES.logged_in.decrypted,
    );
  });

  it("validates the password type before attempting key normalization", async () => {
    const encryptedValue = Buffer.from(TEST_COOKIES.logged_in.encrypted, "hex");

    await expect(
      // Deliberately invalid at runtime: callers reach decrypt() through untyped
      // SQLite rows, so the type guard has to survive a non-string password.
      decrypt(encryptedValue, 123 as unknown as string),
    ).rejects.toThrow("password must be a string");
  });

  it("uses the GCM path when the master key arrives as a 32-byte latin1 string", async () => {
    const key = randomBytes(32);
    const value = "gcm_routed_value";
    const plaintext = Buffer.concat([
      randomBytes(32), // Chrome M127+ SHA-256 domain hash prefix
      Buffer.from(value, "utf8"),
    ]);
    const blob = buildV10Blob(plaintext, key);

    // DPAPI hands the key back as latin1 — a lossless byte<->char mapping.
    await expect(decrypt(blob, key.toString("latin1"), 24)).resolves.toBe(
      value,
    );
  });

  it("uses the GCM path when the master key arrives as a 32-byte Buffer", async () => {
    const key = randomBytes(32);
    const value = "buffer_key_value";
    const blob = buildV10Blob(Buffer.from(value, "utf8"), key);

    await expect(decrypt(blob, key, 23)).resolves.toBe(value);
  });
});
