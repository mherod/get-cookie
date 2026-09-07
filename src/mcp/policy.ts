import { parseArgs } from "node:util";

/**
 * Security and access control policy configuration for the MCP server.
 */
export interface McpPolicy {
  allowedOrigins: ReadonlySet<string>;
  allowCookieValues: boolean;
  allowUnsafeMethods: boolean;
}

/**
 * Error raised when an MCP tool operation or policy validation fails.
 */
export class McpOperationError extends Error {}

/**
 * Parses and validates an absolute HTTP or HTTPS URL string.
 * @param value - The raw URL string to validate.
 * @returns The parsed URL instance.
 * @throws McpOperationError if URL is invalid, non-HTTP(S), or contains credentials/fragments.
 */
export function parseHttpUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new McpOperationError("Provide an absolute HTTP or HTTPS URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.hostname.includes("*")
  ) {
    throw new McpOperationError(
      "URLs must use HTTP(S), without credentials or fragments.",
    );
  }
  return url;
}

/**
 * Validates that the provided URL belongs to an allowed origin per the given policy.
 * @param value - The raw URL string to check.
 * @param policy - The active MCP policy containing allowed origins.
 * @returns The parsed and validated URL instance.
 * @throws McpOperationError if the URL origin is not in the allowed set.
 */
export function assertAllowedUrl(value: string, policy: McpPolicy): URL {
  const url = parseHttpUrl(value);
  if (!policy.allowedOrigins.has(url.origin)) {
    throw new McpOperationError(
      "Origin is not enabled. Add its exact scheme, host and port with --allow-origin at server startup.",
    );
  }
  return url;
}

/**
 * Parses command-line arguments for the MCP server subcommand.
 * @param args - CLI arguments array passed after 'mcp'.
 * @returns Parsed McpPolicy and help flag.
 */
export function parseMcpArgs(args: string[]): McpPolicy & { help: boolean } {
  const { values } = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: {
      "allow-origin": { type: "string", multiple: true },
      "allow-cookie-values": { type: "boolean", default: false },
      "allow-unsafe-methods": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const origins = (values["allow-origin"] ?? []).map((value) => {
    const url = parseHttpUrl(value);
    if (url.pathname !== "/" || url.search) {
      throw new McpOperationError(
        "--allow-origin accepts an origin, without a path or query.",
      );
    }
    if (
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    ) {
      throw new McpOperationError(
        "Use HTTPS origins; HTTP is supported only for explicit loopback origins.",
      );
    }
    return url.origin;
  });
  return {
    allowedOrigins: new Set(origins),
    allowCookieValues: values["allow-cookie-values"],
    allowUnsafeMethods: values["allow-unsafe-methods"],
    help: values.help,
  };
}
