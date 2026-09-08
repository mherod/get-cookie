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

const NETWORK_ERRORS = new Map(
  Object.entries({
    EPERM:
      "Network access was denied. Check the MCP host's network permissions and pass HTTP_PROXY/HTTPS_PROXY and NODE_USE_ENV_PROXY to the server when required.",
    EACCES:
      "Network access was denied. Check the MCP host's network permissions and proxy configuration.",
    ENOTFOUND:
      "DNS lookup failed. Check the destination hostname and proxy configuration.",
    EAI_AGAIN:
      "DNS lookup temporarily failed. Check network connectivity and retry.",
    ECONNREFUSED:
      "The connection was refused. Check that the destination or configured proxy is reachable.",
    ECONNRESET:
      "The connection was reset. Check network connectivity and retry.",
    ETIMEDOUT:
      "The connection timed out. Check network connectivity and proxy configuration.",
    UND_ERR_CONNECT_TIMEOUT:
      "The connection timed out. Check network connectivity and proxy configuration.",
    CERT_HAS_EXPIRED:
      "A TLS certificate has expired. Check the destination or proxy certificate.",
    DEPTH_ZERO_SELF_SIGNED_CERT:
      "A TLS certificate is not trusted. Configure the required CA certificate with NODE_EXTRA_CA_CERTS.",
    SELF_SIGNED_CERT_IN_CHAIN:
      "A TLS certificate is not trusted. Configure the required CA certificate with NODE_EXTRA_CA_CERTS.",
    UNABLE_TO_VERIFY_LEAF_SIGNATURE:
      "A TLS certificate could not be verified. Configure the required CA certificate with NODE_EXTRA_CA_CERTS.",
  }),
);

// Fetch wraps transport errors in `cause` (and sometimes AggregateError).
// Return only known codes and our own messages, never credential-bearing errors.
function networkErrorCode(error: unknown, depth = 0): string | undefined {
  if (!error || typeof error !== "object" || depth > 4) {
    return undefined;
  }
  if (
    "code" in error &&
    typeof error.code === "string" &&
    NETWORK_ERRORS.has(error.code)
  ) {
    return error.code;
  }
  if ("cause" in error) {
    const code = networkErrorCode(error.cause, depth + 1);
    if (code) {
      return code;
    }
  }
  if (error instanceof AggregateError) {
    for (const child of error.errors.slice(0, 8)) {
      const code = networkErrorCode(child, depth + 1);
      if (code) {
        return code;
      }
    }
  }
  return undefined;
}

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
  } catch (error) {
    if (controller.signal.aborted) {
      throw new McpOperationError(
        "Request cancelled or timed out.",
        "REQUEST_ABORTED",
      );
    }
    const code = networkErrorCode(error);
    throw new McpOperationError(
      code
        ? `Authenticated request failed (${code}). ${NETWORK_ERRORS.get(code)}`
        : "Authenticated request failed. Check network connectivity, proxy configuration and TLS certificates.",
      code ?? "FETCH_FAILED",
    );
  } finally {
    clearTimeout(timer);
    cancellation?.removeEventListener("abort", abort);
  }
}
