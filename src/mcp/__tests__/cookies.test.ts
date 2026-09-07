import type { ExportedCookie } from "../../types/schemas";
import {
  cookieDomains,
  cookieHeader,
  cookieMatchesUrl,
  selectCookies,
} from "../cookies";
import { assertAllowedUrl, parseMcpArgs } from "../policy";

const url = new URL("https://app.example.com/api/me");
const cookie = (overrides: Partial<ExportedCookie> = {}): ExportedCookie => ({
  name: "session",
  value: "secret%3D",
  domain: ".example.com",
  expiry: "Infinity",
  meta: { path: "/", file: "profile-one", browser: "Firefox", secure: true },
  ...overrides,
});

describe("MCP cookie scoping", () => {
  it("stops parent queries at public and private suffixes", () => {
    expect(cookieDomains("app.example.co.uk")).toEqual([
      "app.example.co.uk",
      "example.co.uk",
    ]);
    expect(cookieDomains("foo.github.io")).toEqual(["foo.github.io"]);
    expect(cookieDomains("127.0.0.1")).toEqual(["127.0.0.1"]);
  });
  it("checks host-only, domain boundaries, path boundaries, Secure, expiry and partitions", () => {
    expect(cookieMatchesUrl(cookie(), url)).toBe(true);
    for (const invalid of [
      cookie({ domain: "example.com" }),
      cookie({ domain: ".com" }),
      cookie({ domain: ".ample.com" }),
      cookie({ expiry: new Date(0) }),
      cookie({ meta: { path: "/ap", browser: "Firefox" } }),
      cookie({ meta: { browser: "Firefox" } }),
      cookie({ meta: { path: "/", browser: "Firefox", partitioned: true } }),
      cookie({ meta: { path: "/", browser: "Chrome", decrypted: false } }),
    ]) {
      expect(cookieMatchesUrl(invalid, url)).toBe(false);
    }
    expect(
      cookieMatchesUrl(cookie(), new URL("http://app.example.com/api/me")),
    ).toBe(false);
    expect(
      cookieMatchesUrl(
        cookie({ meta: { path: "/api", browser: "Firefox" } }),
        url,
      ),
    ).toBe(true);
  });
  it("deduplicates overlapping queries and orders longer paths first without combining sources", async () => {
    const root = cookie();
    const api = cookie({ meta: { ...root.meta, path: "/api" } });
    const selected = await selectCookies(
      url,
      { browser: "firefox" },
      async () => [root, api, root],
    );
    expect(selected).toEqual([api, root]);
    expect(cookieHeader(selected)).toBe("session=secret%3D; session=secret%3D");
    expect(() =>
      cookieHeader([
        root,
        cookie({ meta: { ...root.meta, file: "profile-two" } }),
      ]),
    ).toThrow("multiple profiles");
    expect(() =>
      cookieHeader([root, cookie({ meta: { ...root.meta, containerId: 2 } })]),
    ).toThrow("multiple profiles");
  });
  it("rejects header injection, conflicts and empty results", async () => {
    for (const value of [
      "x; other=secret",
      "x\r\nHost: elsewhere",
      "x\u0000",
    ]) {
      expect(() => cookieHeader([cookie({ value })])).toThrow("safely");
    }
    expect(() => cookieHeader([cookie({ name: "a=b" })])).toThrow("safely");
    expect(() => cookieHeader([])).toThrow("No readable");
    await expect(
      selectCookies(url, { browser: "firefox" }, async () => [
        cookie(),
        cookie({ value: "other" }),
      ]),
    ).rejects.toThrow("Conflicting");
  });
  it("post-filters exact names even when SQL interprets wildcard characters", async () => {
    const selected = await selectCookies(
      url,
      { browser: "firefox", name: "a_b" },
      async () => [cookie({ name: "acb" }), cookie({ name: "a_b" })],
    );
    expect(selected.map((row) => row.name)).toEqual(["a_b"]);
  });
});

describe("startup policy", () => {
  it("requires an exact enabled origin with matching scheme and port", () => {
    const policy = parseMcpArgs([
      "--allow-origin",
      "https://app.example.com",
      "--allow-origin",
      "http://127.0.0.1:8080",
    ]);
    expect(assertAllowedUrl(url.href, policy).origin).toBe(url.origin);
    for (const denied of [
      "https://app.example.com:444/",
      "https://other.example.com/",
      "http://app.example.com/",
      "https://app.example.com.evil.test/",
    ]) {
      expect(() => assertAllowedUrl(denied, policy)).toThrow("Origin");
    }
    expect(() => assertAllowedUrl(url.href, parseMcpArgs([]))).toThrow(
      "Origin",
    );
  });
  it("rejects unsafe protocols, userinfo, fragments, wildcard origins and unknown arguments", () => {
    for (const origin of [
      "file:///tmp/file",
      "https://user:pass@example.com",
      "https://example.com/#x",
      "https://example.com/path",
      "http://example.com",
      "https://*.example.com",
    ]) {
      expect(() => parseMcpArgs(["--allow-origin", origin])).toThrow();
    }
    expect(() =>
      parseMcpArgs(["--allow-orign", "https://example.com"]),
    ).toThrow();
  });
});
