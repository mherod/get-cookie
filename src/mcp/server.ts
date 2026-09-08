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
  profileDirectory: z
    .string()
    .min(1)
    .max(8192)
    .optional()
    .describe(
      "Exact Firefox profileDirectory returned by list_profiles; takes precedence over profile names.",
    ),
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

function operationError(error: unknown) {
  return error instanceof McpOperationError
    ? { code: error.code, message: error.message }
    : {
        code: "OPERATION_FAILED",
        message:
          "Operation failed. Check local browser access and server configuration.",
      };
}

async function execute(operation: () => Promise<Record<string, unknown>>) {
  try {
    return result(await operation());
  } catch (error) {
    const detail = operationError(error);
    return {
      isError: true,
      structuredContent: { error: detail },
      content: [
        {
          type: "text" as const,
          text: detail.message,
        },
      ],
    };
  }
}

/**
 * Creates and configures an MCP server instance with get-cookie tools.
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
  const server = new McpServer(
    { name: "get-cookie", version },
    {
      instructions:
        "Use get_status to inspect enabled origins. Call list_profiles with the destination URL and optional cookie name to find a matching profile in one call, then pass its browser and name as profile to query_cookies or authenticated_fetch. For Firefox, also pass the returned profileDirectory to select that exact store. Authenticated fetch uses cookies directly; reading their values is unnecessary.",
    },
  );
  server.registerTool(
    "get_status",
    {
      description:
        "Show enabled origins, cookie-value access, HTTP methods and proxy environment configuration. Does not probe the network or read cookies.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () =>
      result({
        version,
        allowedOrigins: [...policy.allowedOrigins].sort(),
        cookieValuesEnabled: policy.allowCookieValues,
        allowedMethods: policy.allowUnsafeMethods
          ? ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          : ["GET", "HEAD"],
        network: {
          proxyConfigured: Boolean(
            process.env.HTTPS_PROXY ||
              process.env.https_proxy ||
              process.env.HTTP_PROXY ||
              process.env.http_proxy,
          ),
          nodeUseEnvProxy: process.env.NODE_USE_ENV_PROXY === "1",
        },
        nextStep: policy.allowedOrigins.size
          ? "Call list_profiles with a URL on an enabled origin to find a profile containing applicable cookies."
          : "Add --allow-origin https://your-site.example to the MCP server arguments and restart the server to enable cookie queries and requests.",
      }),
  );
  server.registerTool(
    "list_profiles",
    {
      description:
        "List local browser profiles. Supply a URL on an enabled origin to count applicable cookies in each profile and find the right account in one call. Cookie values are never returned. Zero matches can also indicate an inaccessible store. Safari uses its default store; query it directly.",
      inputSchema: {
        browser: browser.optional(),
        url: selection.url.optional(),
        name: selection.name,
        container: selection.container,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (input, extra) =>
      execute(async () => {
        if (input.url === undefined) {
          if (input.name !== undefined || input.container !== undefined) {
            throw new McpOperationError(
              "Provide a URL to check cookies by name or container.",
              "URL_REQUIRED",
            );
          }
          return deps.listProfiles(input.browser);
        }
        const url = assertAllowedUrl(input.url, policy);
        if (input.container !== undefined && input.browser !== "firefox") {
          throw new McpOperationError(
            "Select browser firefox when filtering by container.",
            "FIREFOX_REQUIRED",
          );
        }
        const discovered = deps.listProfiles(input.browser);
        const profiles = [];
        for (const profile of discovered.profiles) {
          extra.signal.throwIfAborted();
          try {
            const cookies = await selectCookies(
              url,
              {
                browser: profile.browser,
                profile: profile.name,
                ...(profile.profileDirectory !== undefined && {
                  profileDirectory: profile.profileDirectory,
                }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.container !== undefined && {
                  container: input.container,
                }),
              },
              deps.readCookies,
            );
            profiles.push({ ...profile, cookieCount: cookies.length });
          } catch (error) {
            profiles.push({
              ...profile,
              cookieCount: null,
              error: operationError(error),
            });
          }
        }
        extra.signal.throwIfAborted();
        return {
          ...discovered,
          profiles,
          matchingProfiles: profiles.filter(
            (p) => p.cookieCount !== null && p.cookieCount > 0,
          ).length,
          note: `${discovered.note} Counts include only applicable cookies; zero can also mean an inaccessible store. Pass the returned name as profile and, for Firefox, profileDirectory when querying or fetching.`,
        };
      }),
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
