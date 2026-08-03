import { createCipheriv, randomBytes } from "node:crypto";

import { decryptV10Cookie } from "../decryptV10Cookie";

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

describe("decryptV10Cookie — Chrome M127+ hash prefix", () => {
  const key = randomBytes(32);

  it("strips the 32-byte hash prefix when metaVersion >= 24", () => {
    const value = "real_cookie_value";
    const plaintext = Buffer.concat([
      randomBytes(32), // synthetic SHA-256 domain hash prefix
      Buffer.from(value, "utf8"),
    ]);
    const blob = buildV10Blob(plaintext, key);

    expect(decryptV10Cookie(blob, key, 24)).toBe(value);
  });

  it("does not strip the prefix when metaVersion < 24", () => {
    const value = "legacy_value";
    const blob = buildV10Blob(Buffer.from(value, "utf8"), key);

    expect(decryptV10Cookie(blob, key, 23)).toBe(value);
  });

  it("does not strip the prefix when metaVersion is undefined", () => {
    const value = "no_meta_value";
    const blob = buildV10Blob(Buffer.from(value, "utf8"), key);

    expect(decryptV10Cookie(blob, key)).toBe(value);
  });

  it("round-trips unicode values with the prefix stripped (metaVersion 24)", () => {
    const value = "こんにちは🌍";
    const plaintext = Buffer.concat([
      randomBytes(32),
      Buffer.from(value, "utf8"),
    ]);
    const blob = buildV10Blob(plaintext, key);

    expect(decryptV10Cookie(blob, key, 24)).toBe(value);
  });

  it("returns an empty value when the decrypted payload is only the hash prefix", () => {
    const blob = buildV10Blob(randomBytes(32), key);

    expect(decryptV10Cookie(blob, key, 24)).toBe("");
  });
});
