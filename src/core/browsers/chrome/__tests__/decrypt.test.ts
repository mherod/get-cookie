import { Buffer } from "buffer";

import { decrypt } from "../decrypt";

const TEST_PASSWORD = "test-password";

describe("decrypt", () => {
  it("should decrypt Chrome cookie values", async () => {
    const encryptedValue = Buffer.from("test-encrypted-value");
    const decrypted = await decrypt(encryptedValue, TEST_PASSWORD);
    expect(decrypted).toBe("test-decrypted-value");
  });

  it("should reject if password is not a string", async () => {
    const encryptedValue = Buffer.from("test-encrypted-value");
    await expect(
      decrypt(encryptedValue, 123 as unknown as string),
    ).rejects.toThrow("password must be a string");
  });

  it("should reject if encrypted data is not a buffer", async () => {
    await expect(
      decrypt("not a buffer" as unknown as Buffer, TEST_PASSWORD),
    ).rejects.toThrow("encryptedData must be a Buffer");
  });

  it("should reject if encrypted data length is not a multiple of 16", async () => {
    const encryptedValue = Buffer.from("invalid-length");
    await expect(decrypt(encryptedValue, TEST_PASSWORD)).rejects.toThrow(
      "Encrypted data length is not a multiple of 16",
    );
  });
});
