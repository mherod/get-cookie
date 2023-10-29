import { getMergedRenderedCookies } from "./getMergedRenderedCookies";
import { MultiCookieSpec } from "./CookieSpec";

describe("getMergedRenderedCookies", () => {
  it("should return empty string if no cookies are present", async () => {
    const cookieSpec: MultiCookieSpec = [];
    const result = await getMergedRenderedCookies(cookieSpec);
    expect(result).toBe("");
  });

  it("should return rendered cookies if cookies are present", async () => {
    const cookieSpec: MultiCookieSpec = [
      {
        name: "sessionCookie",
        domain: "www.example.com",
      },
      {
        name: "persistentCookie",
        domain: "www.example.com",
      },
    ];
    const result = await getMergedRenderedCookies(cookieSpec);
    expect(result).not.toBe("");
  });
});
