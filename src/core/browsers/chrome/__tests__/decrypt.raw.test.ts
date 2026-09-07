import { createCipheriv, pbkdf2Sync } from "node:crypto";

import { withRawCookieValues } from "../../../cookies/CookieQueryContext";
import { decrypt } from "../decrypt";

jest.mock("@utils/platformUtils", () => ({
  isMacOS: () => true,
  isWindows: () => false,
}));

it("preserves full authentication values without changing concurrent display queries", async () => {
  const value = "prefix-12345678-1234-1234-1234-123456789abc-suffix";
  const cipher = createCipheriv(
    "aes-128-cbc",
    pbkdf2Sync("password", "saltysalt", 1003, 16, "sha1"),
    Buffer.alloc(16, " "),
  );
  const encrypted = Buffer.concat([
    Buffer.from("v10"),
    cipher.update(value),
    cipher.final(),
  ]);
  const [raw, display] = await Promise.all([
    withRawCookieValues(async () => decrypt(encrypted, "password")),
    decrypt(encrypted, "password"),
  ]);
  expect(raw).toBe(value);
  expect(display).toBe("12345678-1234-1234-1234-123456789abc");
});
