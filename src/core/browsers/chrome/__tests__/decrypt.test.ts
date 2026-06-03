import { decrypt } from "../decrypt";

import {
  ERROR_CASES,
  TEST_COOKIES,
  TEST_PASSWORD,
} from "./fixtures/cookieFixtures";

describe("decrypt", () => {
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
        Array.from({ length: 25 }, () =>
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
