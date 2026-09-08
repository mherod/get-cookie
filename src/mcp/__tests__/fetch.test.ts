import { jest } from "@jest/globals";

import type { CookieReader } from "../cookies";
import { authenticatedFetch, type FetchInput } from "../fetch";
import { parseMcpArgs } from "../policy";

const policy = parseMcpArgs(["--allow-origin", "https://example.com"]);
const input: FetchInput = {
  url: "https://example.com/api/me",
  browser: "firefox",
  method: "GET",
  timeoutMs: 1000,
  maxResponseBytes: 5,
};
const reader: CookieReader = async () => [
  {
    domain: "example.com",
    name: "session",
    value: "secret%3D",
    meta: { browser: "Firefox", file: "one", path: "/api", secure: true },
  },
];

describe("authenticated fetch", () => {
  it("sends scoped raw cookies, bounds the body and omits credential-bearing headers", async () => {
    const request = jest.fn<typeof fetch>().mockResolvedValue(
      new Response("abcdef", {
        headers: {
          "set-cookie": "new=secret",
          "content-type": "text/plain",
          "x-token": "private",
        },
      }),
    );
    const result = await authenticatedFetch(input, policy, reader, request);
    const options = request.mock.calls[0]?.[1];
    expect(new Headers(options?.headers).get("cookie")).toBe(
      "session=secret%3D",
    );
    expect(options?.redirect).toBe("manual");
    expect(result).toMatchObject({
      body: "abcde",
      bytes: 5,
      truncated: true,
      cookiesSent: 1,
    });
    expect(result.headers).toEqual({ "content-type": "text/plain" });
  });
  it("returns redirects without issuing another request", async () => {
    const request = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.test", "set-cookie": "secret=x" },
      }),
    );
    expect(
      await authenticatedFetch(input, policy, reader, request),
    ).toMatchObject({ status: 302, redirect: true });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("blocks disallowed origins, methods and headers before reading cookies", async () => {
    const read = jest.fn(reader);
    for (const change of [
      { url: "https://evil.test" },
      { method: "POST" },
      { headers: { Cookie: "injected" } },
      { headers: { Host: "evil.test" } },
      { body: "unexpected" },
    ]) {
      await expect(
        authenticatedFetch({ ...input, ...change }, policy, read),
      ).rejects.toThrow();
    }
    expect(read).not.toHaveBeenCalled();
  });
  it("supports explicitly enabled POST requests and returns HTTP errors as data", async () => {
    const request = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("denied", { status: 403 }));
    const result = await authenticatedFetch(
      {
        ...input,
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      },
      { ...policy, allowUnsafeMethods: true },
      reader,
      request,
    );
    expect(result.status).toBe(403);
    expect(result.ok).toBe(false);
    expect(request.mock.calls[0]?.[1]?.body).toBe("{}");
  });
  it("never fetches without cookies or after cancellation", async () => {
    const request = jest.fn<typeof fetch>();
    await expect(
      authenticatedFetch(input, policy, async () => [], request),
    ).rejects.toThrow("No readable");
    const controller = new AbortController();
    controller.abort();
    await expect(
      authenticatedFetch(input, policy, reader, request, controller.signal),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("cancels a stalled response body at the timeout", async () => {
    const request: typeof fetch = async (_url, options) =>
      new Response(
        new ReadableStream({
          start(controller) {
            options?.signal?.addEventListener("abort", () =>
              controller.error(new Error("aborted")),
            );
          },
        }),
      );
    await expect(
      authenticatedFetch({ ...input, timeoutMs: 20 }, policy, reader, request),
    ).rejects.toThrow("timed out");
  });
  it.each([
    ["EPERM", "HTTP_PROXY"],
    ["ENOTFOUND", "hostname"],
    ["ECONNREFUSED", "reachable"],
    ["CERT_HAS_EXPIRED", "expired"],
    ["SELF_SIGNED_CERT_IN_CHAIN", "NODE_EXTRA_CA_CERTS"],
    ["UND_ERR_CONNECT_TIMEOUT", "timed out"],
  ])("explains %s failures without exposing transport details", async (code, hint) => {
    const cause = Object.assign(new Error("secret request details"), { code });
    const error = Object.assign(new TypeError("secret cookie header"), {
      cause,
    });
    const request = jest.fn<typeof fetch>().mockRejectedValue(error);
    await expect(
      authenticatedFetch(input, policy, reader, request),
    ).rejects.toMatchObject({ code, message: expect.stringContaining(hint) });
    await expect(
      authenticatedFetch(input, policy, reader, request),
    ).rejects.not.toThrow("secret");
  });
  it("recognizes errors nested inside AggregateError", async () => {
    const error = Object.assign(new Error("secret"), {
      cause: new AggregateError([
        Object.assign(new Error("secret"), { code: "EACCES" }),
      ]),
    });
    const request = jest.fn<typeof fetch>().mockRejectedValue(error);
    await expect(
      authenticatedFetch(input, policy, reader, request),
    ).rejects.toMatchObject({ code: "EACCES" });
  });
  it("bounds circular error causes and hides unknown codes and raw messages", async () => {
    const error: { message: string; code: string; cause?: unknown } = {
      message: "secret",
      code: "secret",
    };
    error.cause = error;
    const request = jest.fn<typeof fetch>().mockRejectedValue(error);
    await expect(
      authenticatedFetch(input, policy, reader, request),
    ).rejects.toMatchObject({
      code: "FETCH_FAILED",
      message: expect.not.stringContaining("secret"),
    });
  });
});
