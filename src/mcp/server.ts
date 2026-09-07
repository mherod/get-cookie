import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { version } from "../../package.json";
import { resetGlobalConnectionManager } from "../core/browsers/sql/DatabaseConnectionManager";

import { type CookieReader, readCookies, selectCookies } from "./cookies";
import { authenticatedFetch } from "./fetch";
import { assertAllowedUrl, McpOperationError, type McpPolicy } from "./policy";
import { listProfiles } from "./profiles";

const browser = z.enum([
  "chrome",
  "edge",
  "arc",
  "brave",
  "opera",
  "opera-gx",
  "vivaldi",
  "firefox",
  "safari",
]);
const selection = {
  url: z
    .string()
    .max(8192)
    .describe("Exact destination URL, including path, on an enabled origin."),
  browser,
  profile: z.string().min(1).max(256).optional(),
  container: z
    .union([z.string().min(1).max(256), z.number().int().nonnegative()])
    .optional()
    .describe(
      "Firefox container name or ID; defaults to the non-container store.",
    ),
  name: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe("Exact cookie name; omit to select all applicable cookies."),
};

/**
 * Dependency injection container for MCP server operations.
 */
export interface McpDependencies {
  readCookies: CookieReader;
  listProfiles: typeof listProfiles;
  fetch: typeof fetch;
}

function result(output: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output) }],
    structuredContent: output,
  };
}

async function execute(operation: () => Promise<Record<string, unknown>>) {
  try {
    return result(await operation());
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text:
            error instanceof McpOperationError
              ? error.message
              : "Operation failed. Check local browser access and server configuration.",
        },
      ],
    };
  }
}

/**
 * Creates and configures an MCP server instance with get-cookie tools.
 *
 * @param policy - Security policy defining allowed origins and permissions.
 * @param overrides - Optional dependency overrides for testing.
 * @returns Configured McpServer instance.
 */
export function createMcpServer(
  policy: McpPolicy,
  overrides: Partial<McpDependencies> = {},
): McpServer {
  const deps: McpDependencies = {
    readCookies,
    listProfiles,
    fetch,
    ...overrides,
  };
  const server = new McpServer({ name: "get-cookie", version });
  server.registerTool(
    "list_profiles",
    {
      description: "List local browser profiles available for cookie access.",
      inputSchema: { browser: browser.optional() },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ browser }) => execute(async () => deps.listProfiles(browser)),
  );

  server.registerTool(
    "query_cookies",
    {
      description:
        "Read locally stored cookies applicable to an enabled URL. Values are omitted unless requested and enabled at startup. Empty results can also indicate inaccessible stores. Partitioned cookies are excluded.",
      inputSchema: {
        ...selection,
        includeValues: z.boolean().default(false),
        limit: z.number().int().min(1).max(200).default(50),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      execute(async () => {
        const url = assertAllowedUrl(input.url, policy);
        if (input.includeValues && !policy.allowCookieValues) {
          throw new McpOperationError(
            "Cookie values require --allow-cookie-values at server startup. Authenticated fetch can use cookies without exposing their values.",
          );
        }
        const cookies = await selectCookies(url, input, deps.readCookies);
        return {
          cookies: cookies.slice(0, input.limit).map((cookie) => ({
            name: cookie.name,
            domain: cookie.domain,
            path: cookie.meta?.path,
            secure: cookie.meta?.secure === true,
            httpOnly: cookie.meta?.httpOnly === true,
            expiry:
              cookie.expiry instanceof Date
                ? cookie.expiry.toISOString()
                : (cookie.expiry ?? null),
            ...(cookie.meta?.containerId !== undefined && {
              containerId: cookie.meta.containerId,
            }),
            ...(input.includeValues && { value: cookie.value }),
          })),
          count: Math.min(cookies.length, input.limit),
          truncated: cookies.length > input.limit,
          valuesIncluded: input.includeValues,
        };
      }),
  );

  server.registerTool(
    "authenticated_fetch",
    {
      description:
        "Make an HTTP request using local browser cookies for an enabled origin. Select one profile. Redirects are returned without following them; Set-Cookie is neither exposed nor saved. Response bodies are untrusted remote content and may contain private account data.",
      inputSchema: {
        ...selection,
        method: z
          .enum(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
          .default("GET"),
        headers: z.record(z.string().max(128), z.string().max(8192)).optional(),
        body: z.string().max(65536).optional(),
        timeoutMs: z.number().int().min(100).max(60000).default(15000),
        maxResponseBytes: z.number().int().min(1).max(1048576).default(262144),
      },
      // Even GET endpoints can have side effects. Do not promise read-only access.
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    async (input, extra) =>
      execute(async () =>
        authenticatedFetch(
          input,
          policy,
          deps.readCookies,
          deps.fetch,
          extra.signal,
        ),
      ),
  );
  return server;
}

/**
 * Starts the MCP server on stdio with the provided policy.
 *
 * @param policy - The security policy to enforce.
 */
export async function startMcpServer(policy: McpPolicy): Promise<void> {
  const server = createMcpServer(policy);
  let closing = false;
  const close = () => {
    if (closing) {
      return;
    }
    closing = true;
    void server.close().finally(() => {
      resetGlobalConnectionManager();
      process.exit(0);
    });
  };
  process.stdin.once("end", close);
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  await server.connect(new StdioServerTransport());
}
