import { createCipheriv, pbkdf2Sync } from "node:crypto";

import { withRawCookieValues } from "../../../cookies/CookieQueryContext";
import { decrypt } from "../decrypt";

jest.mock("@utils/platformUtils", () => ({
  isLinux: () => false,
  isMacOS: () => true,
  isWindows: () => false,
}));

function encryptAes128Cbc(value: string, password = "password"): Buffer {
  const cipher = createCipheriv(
    "aes-128-cbc",
    pbkdf2Sync(password, "saltysalt", 1003, 16, "sha1"),
    Buffer.alloc(16, " "),
  );
  return Buffer.concat([
    Buffer.from("v10"),
    cipher.update(value),
    cipher.final(),
  ]);
}

describe("decrypt - raw cookie values vs display mode", () => {
  it("preserves full authentication values without changing concurrent display queries", async () => {
    const value = "prefix-12345678-1234-1234-1234-123456789abc-suffix";
    const encrypted = encryptAes128Cbc(value);

    const [raw, display] = await Promise.all([
      withRawCookieValues(async () => decrypt(encrypted, "password")),
      decrypt(encrypted, "password"),
    ]);

    expect(raw).toBe(value);
    expect(display).toBe("12345678-1234-1234-1234-123456789abc");
  });

  it("preserves percent-encoded values and JWTs unchanged in raw mode", async () => {
    const percentEncoded = "user%20token%3Dsecret%26scope%3Dadmin%2Bwrite";
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP8p4w62I";

    const encPercent = encryptAes128Cbc(percentEncoded);
    const encJwt = encryptAes128Cbc(jwt);

    const [rawPercent, rawJwt] = await Promise.all([
      withRawCookieValues(async () => decrypt(encPercent, "password")),
      withRawCookieValues(async () => decrypt(encJwt, "password")),
    ]);

    expect(rawPercent).toBe(percentEncoded);
    expect(rawJwt).toBe(jwt);
  });

  it("handles empty and malformed encrypted values in raw mode", async () => {
    // On macOS non-versioned buffers are treated as legacy plaintext
    const plaintext = await withRawCookieValues(async () =>
      decrypt(Buffer.from("legacy-plaintext"), "password"),
    );
    expect(plaintext).toBe("legacy-plaintext");

    // v10-prefixed buffer with invalid length throws
    await expect(
      withRawCookieValues(async () =>
        decrypt(Buffer.from("v10invalidlength"), "password"),
      ),
    ).rejects.toThrow("Encrypted data length is not a multiple of 16");
  });
});
