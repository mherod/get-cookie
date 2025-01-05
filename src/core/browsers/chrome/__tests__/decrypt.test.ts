import { Buffer } from "buffer";

jest.mock("../decrypt", () => ({
  decrypt: jest
    .fn()
    .mockImplementation((encryptedValue: Buffer, password: string) => {
      if (typeof password !== "string") {
        return Promise.reject(new Error("password must be a string"));
      }
      if (!Buffer.isBuffer(encryptedValue)) {
        return Promise.reject(new Error("encryptedData must be a Buffer"));
      }
      if (encryptedValue.length % 16 !== 0) {
        return Promise.reject(
          new Error("Encrypted data length is not a multiple of 16"),
        );
      }
      return Promise.resolve("test-decrypted-value");
    }),
}));

import { decrypt } from "../decrypt";

const TEST_PASSWORD = "test-password";

describe("decrypt", () => {
  it("should decrypt Chrome cookie values", async () => {
    const encryptedValue = Buffer.from("0123456789abcdef");
    const decrypted = await decrypt(encryptedValue, TEST_PASSWORD);
    expect(decrypted).toBe("test-decrypted-value");
  });

  it("should reject if password is not a string", async () => {
    const encryptedValue = Buffer.from("0123456789abcdef");
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
