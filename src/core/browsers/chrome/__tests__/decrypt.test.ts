import { decrypt } from "../decrypt";

import {
  ERROR_CASES,
  TEST_COOKIES,
  TEST_PASSWORD,
} from "./fixtures/cookieFixtures";

describe("decrypt", () => {
  describe("successful decryption", () => {
    it.each(Object.entries(TEST_COOKIES))(
      "should decrypt the %s cookie",
      async (_name, cookie) => {
        const encryptedValue = Buffer.from(cookie.encrypted, "hex");
        const decrypted = await decrypt(encryptedValue, TEST_PASSWORD);

        if ("contains" in cookie) {
          for (const value of cookie.contains) {
            expect(decrypted).toContain(value);
          }
        } else {
          expect(decrypted).toBe(cookie.decrypted);
        }
      },
    );
  });

  describe("error handling", () => {
    it.each(ERROR_CASES)("should reject if $name", async ({ input, error }) => {
      await expect(decrypt(input.value, input.password)).rejects.toThrow(error);
    });
  });
});
