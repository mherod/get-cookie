import {
  cookieHeader,
  type CookieReader,
  type CookieSelection,
  selectCookies,
} from "./cookies";
import { assertAllowedUrl, McpOperationError, type McpPolicy } from "./policy";

/**
 * Input arguments for the authenticated HTTP fetch operation.
 */
export interface FetchInput extends CookieSelection {
  url: string;
  method: string;
  headers?: Record<string, string> | undefined;
  body?: string | undefined;
  timeoutMs: number;
  maxResponseBytes: number;
}

const REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "content-type",
  "if-none-match",
  "if-modified-since",
  "x-csrf-token",
  "x-xsrf-token",
  "x-requested-with",
]);
const RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "etag",
  "last-modified",
  "retry-after",
];

async function readBody(response: Response, limit: number) {
  if (!response.body) {
    return { body: "", truncated: false, bytes: 0 };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      const remaining = limit - bytes;
      if (result.value.byteLength > remaining) {
        chunks.push(result.value.subarray(0, remaining));
        bytes += remaining;
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(result.value);
      bytes += result.value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  return { body: Buffer.concat(chunks).toString("utf8"), truncated, bytes };
}

/**
 * Performs an HTTP request with local cookies attached, respecting origin and method policy.
 * @param input - Request parameters and cookie selection criteria.
 * @param policy - Security policy enforcing origin and method constraints.
 * @param reader - Function for extracting local cookies.
 * @param fetchImpl - Fetch implementation (defaults to global fetch).
 * @param cancellation - Optional external cancellation signal.
 * @returns Response object with status, headers, body, and truncation indicator.
 */
export async function authenticatedFetch(
  input: FetchInput,
  policy: McpPolicy,
  reader: CookieReader,
  fetchImpl: typeof fetch = fetch,
  cancellation?: AbortSignal,
) {
  const url = assertAllowedUrl(input.url, policy);
  if (!["GET", "HEAD"].includes(input.method) && !policy.allowUnsafeMethods) {
    throw new McpOperationError(
      "This method requires --allow-unsafe-methods at server startup.",
    );
  }
  if (input.body !== undefined && ["GET", "HEAD"].includes(input.method)) {
    throw new McpOperationError("GET and HEAD cannot include a request body.");
  }
  if (input.body !== undefined && Buffer.byteLength(input.body) > 65536) {
    throw new McpOperationError("Request body exceeds 64 KiB.");
  }
  const headers = new Headers();
  for (const [name, value] of Object.entries(input.headers ?? {})) {
    if (!REQUEST_HEADERS.has(name.toLowerCase())) {
      throw new McpOperationError(
        "Unsupported request header. Cookie and transport headers are managed by the server.",
      );
    }
    headers.set(name, value);
  }
  cancellation?.throwIfAborted();
  const cookies = await selectCookies(url, input, reader);
  cancellation?.throwIfAborted();
  headers.set("cookie", cookieHeader(cookies));
  const controller = new AbortController();
  const abort = () => controller.abort();
  cancellation?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, input.timeoutMs);
  try {
    // Manual redirects are essential: even another allowed origin must get its
    // own explicit call and freshly selected cookies. Never forward this header.
    const response = await fetchImpl(url, {
      method: input.method,
      headers,
      redirect: "manual",
      signal: controller.signal,
      ...(input.body !== undefined && { body: input.body }),
    });
    const responseHeaders: Record<string, string> = {};
    for (const name of RESPONSE_HEADERS) {
      const value = response.headers.get(name);
      if (value !== null) {
        responseHeaders[name] = value;
      }
    }
    const body = await readBody(response, input.maxResponseBytes);
    return {
      status: response.status,
      ok: response.ok,
      redirect: response.status >= 300 && response.status < 400,
      headers: responseHeaders,
      ...body,
      cookiesSent: cookies.length,
    };
  } catch {
    throw new McpOperationError(
      controller.signal.aborted
        ? "Request cancelled or timed out."
        : "Authenticated request failed.",
    );
  } finally {
    clearTimeout(timer);
    cancellation?.removeEventListener("abort", abort);
  }
}
