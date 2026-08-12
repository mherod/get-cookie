import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

import { isMacOS, isWindows } from "@utils/platformUtils";

import { decrypt } from "../decrypt";

import {
  ERROR_CASES,
  TEST_COOKIES,
  TEST_PASSWORD,
} from "./fixtures/cookieFixtures";

jest.mock("@utils/platformUtils", () => ({
  isMacOS: jest.fn(() => false),
  isWindows: jest.fn(() => false),
}));

const mockIsMacOS = isMacOS as jest.MockedFunction<typeof isMacOS>;
const mockIsWindows = isWindows as jest.MockedFunction<typeof isWindows>;

function buildWindowsV10Blob(plaintext: Buffer, key: Buffer): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([
    Buffer.from("v10"),
    nonce,
    ciphertext,
    cipher.getAuthTag(),
  ]);
}

function buildCbcBlob(plaintext: Buffer, password: string): Buffer {
  const key = pbkdf2Sync(password, "saltysalt", 1003, 16, "sha1");
  const cipher = createCipheriv("aes-128-cbc", key, Buffer.alloc(16, " "));
  return Buffer.concat([
    Buffer.from("v10"),
    cipher.update(plaintext),
    cipher.final(),
  ]);
}

describe("decrypt", () => {
  beforeEach(() => {
    mockIsMacOS.mockReturnValue(false);
    mockIsWindows.mockReturnValue(false);
  });

  describe("successful decryption", () => {
    it.each(
      Object.entries(TEST_COOKIES),
    )("should decrypt the %s cookie", async (_name, cookie) => {
      const encryptedValue = Buffer.from(cookie.encrypted, "hex");
      const decrypted = await decrypt(encryptedValue, TEST_PASSWORD);

      if ("contains" in cookie) {
        for (const value of cookie.contains) {
          expect(decrypted).toContain(value);
        }
      } else {
        expect(decrypted).toBe(cookie.decrypted);
      }
    });
  });

  describe("error handling", () => {
    it.each(ERROR_CASES)("should reject if $name", async ({ input, error }) => {
      await expect(decrypt(input.value, input.password)).rejects.toThrow(error);
    });
  });

  describe("Windows v10 routing", () => {
    it("keeps legacy AES-CBC fixtures on the CBC path when the string key is not 32 bytes", async () => {
      mockIsWindows.mockReturnValue(true);
      const cookie = TEST_COOKIES.logged_in;

      await expect(
        decrypt(Buffer.from(cookie.encrypted, "hex"), TEST_PASSWORD),
      ).resolves.toBe(cookie.decrypted);
    });

    it("uses AES-GCM for a losslessly encoded 32-byte Windows key without applying CBC cleanup", async () => {
      mockIsWindows.mockReturnValue(true);
      const key = randomBytes(32);
      const value = "keep'this_whole";
      const plaintext = Buffer.concat([
        randomBytes(32),
        Buffer.from(value, "utf8"),
      ]);
      const blob = buildWindowsV10Blob(plaintext, key);

      await expect(decrypt(blob, key.toString("latin1"), 24)).resolves.toBe(
        value,
      );
    });
  });

  it("returns an empty CBC cookie value when the payload is only the M127 hash prefix", async () => {
    const blob = buildCbcBlob(randomBytes(32), TEST_PASSWORD);

    await expect(decrypt(blob, TEST_PASSWORD, 24)).resolves.toBe("");
  });

  // Regression coverage for the per-password derived-key cache. The derivation
  // is memoized, so the risk is a corrupt or shared-promise cache returning the
  // wrong key. Repeated and concurrent calls must still produce identical,
  // correct plaintext.
  describe("derived-key caching", () => {
    it("produces identical output across many repeated decryptions", async () => {
      const encryptedValue = Buffer.from(
        TEST_COOKIES.logged_in.encrypted,
        "hex",
      );
      const baseline = await decrypt(encryptedValue, TEST_PASSWORD);

      const results = await Promise.all(
        Array.from({ length: 25 }, async () =>
          decrypt(encryptedValue, TEST_PASSWORD),
        ),
      );

      for (const result of results) {
        expect(result).toBe(baseline);
        expect(result).toBe(TEST_COOKIES.logged_in.decrypted);
      }
    });

    it("decrypts every cookie correctly when run concurrently on a shared password", async () => {
      const results = await Promise.all(
        Object.entries(TEST_COOKIES).map(async ([, cookie]) => ({
          cookie,
          decrypted: await decrypt(
            Buffer.from(cookie.encrypted, "hex"),
            TEST_PASSWORD,
          ),
        })),
      );

      for (const { cookie, decrypted } of results) {
        if ("contains" in cookie) {
          for (const value of cookie.contains) {
            expect(decrypted).toContain(value);
          }
        } else {
          expect(decrypted).toBe(cookie.decrypted);
        }
      }
    });
  });
});
