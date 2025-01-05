import { CookieRow } from "../../../../../types/schemas";

/**
 *
 */
export const testCookies: CookieRow[] = [
  {
    name: "test-cookie",
    value: Buffer.from("test-value"),
    domain: "example.com",
    expiry: Date.now() + 86400000, // 1 day in the future
  },
];
