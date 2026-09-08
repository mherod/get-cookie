import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

import { isLinux, isMacOS, isWindows } from "@utils/platformUtils";

import { decrypt } from "../decrypt";

import {
  ERROR_CASES,
  TEST_COOKIES,
  TEST_PASSWORD,
} from "./fixtures/cookieFixtures";

jest.mock("@utils/platformUtils", () => ({
  isLinux: jest.fn(() => false),
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

function buildCbcBlob(
  plaintext: Buffer,
  password: string,
  iterations = 1003,
  prefix = "v10",
): Buffer {
  const key = pbkdf2Sync(password, "saltysalt", iterations, 16, "sha1");
  const cipher = createCipheriv("aes-128-cbc", key, Buffer.alloc(16, " "));
  return Buffer.concat([
    Buffer.from(prefix),
    cipher.update(plaintext),
    cipher.final(),
  ]);
}

describe("decrypt", () => {
  beforeEach(() => {
    jest.mocked(isLinux).mockReturnValue(false);
    mockIsMacOS.mockReturnValue(false);
    mockIsWindows.mockReturnValue(false);
  });

  describe("successful decryption", () => {
    const cases = Object.entries(TEST_COOKIES);
    it.each(cases)("decrypts the %s cookie", async (_name, cookie) => {
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

  describe("Linux fallback passwords", () => {
    beforeEach(() => jest.mocked(isLinux).mockReturnValue(true));
    const prefixes = ["v10", "v11"];
    const forPrefix = it.each(prefixes);
    forPrefix(
      "decrypts empty-password %s cookies without value cleanup",
      async (prefix) => {
        const value = "whole'value%2F中文;USD";
        const blob = buildCbcBlob(Buffer.from(value), "", 1, prefix);
        expect(await decrypt(blob, "wrong-keyring")).toBe(value);
      },
    );
    it("accepts the supplied key before basic and empty passwords", async () => {
      const value = "retain'whole-value";
      expect(
        await decrypt(
          buildCbcBlob(Buffer.from(value), "keyring", 1),
          "keyring",
        ),
      ).toBe(value);
      expect(
        await decrypt(buildCbcBlob(Buffer.from(value), "peanuts", 1), "wrong"),
      ).toBe(value);
    });
    it("strips the version 24 hash prefix, including an empty cookie", async () => {
      const hash = Buffer.alloc(32, 0xff);
      expect(
        await decrypt(
          buildCbcBlob(Buffer.concat([hash, Buffer.from("✓")]), "", 1),
          "wrong",
          24,
        ),
      ).toBe("✓");
      expect(await decrypt(buildCbcBlob(hash, "", 1), "wrong", 24)).toBe("");
    });
    it("rejects invalid UTF-8 and undersized hash payloads", async () => {
      await expect(
        decrypt(buildCbcBlob(Buffer.from([0xff]), "", 1), "wrong"),
      ).rejects.toThrow("no Linux password");
      await expect(
        decrypt(buildCbcBlob(Buffer.from("short"), "", 1), "wrong", 24),
      ).rejects.toThrow("no Linux password");
    });
    it("rejects invalid padding and unsupported prefixes", async () => {
      const invalid = buildCbcBlob(Buffer.from("hello"), "", 1);
      invalid[invalid.length - 1] =
        invalid.readUInt8(invalid.length - 1) ^ 0xff;
      await expect(decrypt(invalid, "wrong")).rejects.toThrow(
        "no Linux password",
      );
      await expect(
        decrypt(buildCbcBlob(Buffer.from("hello"), "", 1, "v20"), "wrong"),
      ).rejects.toThrow("Unsupported Linux");
    });
    it("keeps Linux and macOS key derivations separate in the cache", async () => {
      const value = "cache-value";
      expect(
        await decrypt(buildCbcBlob(Buffer.from(value), "same", 1), "same"),
      ).toBe(value);
      jest.mocked(isLinux).mockReturnValue(false);
      mockIsMacOS.mockReturnValue(true);
      expect(
        await decrypt(buildCbcBlob(Buffer.from(value), "same"), "same"),
      ).toBe(value);
    });
  });

  describe("error handling", () => {
    it.each(ERROR_CASES)("should reject if $name", async ({ input, error }) => {
      await expect(decrypt(input.value, input.password)).rejects.toThrow(error);
    });
  });

  describe("Windows v10 routing", () => {
    it("reports a non-string password before normalizing the Windows key", async () => {
      mockIsWindows.mockReturnValue(true);
      const encryptedValue = Buffer.from(
        TEST_COOKIES.logged_in.encrypted,
        "hex",
      );

      await expect(
        decrypt(encryptedValue, 123 as unknown as string),
      ).rejects.toThrow("password must be a string");
    });

    it("uses AES-GCM when the Windows master key arrives as a Buffer", async () => {
      mockIsWindows.mockReturnValue(true);
      const key = randomBytes(32);
      const value = "buffer_key_value";
      const blob = buildWindowsV10Blob(Buffer.from(value, "utf8"), key);

      await expect(decrypt(blob, key, 23)).resolves.toBe(value);
    });

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
