import { jest } from "@jest/globals";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import type { CookieReader } from "../cookies";
import { parseMcpArgs } from "../policy";
import { createMcpServer } from "../server";

const url = "https://example.com/api/me";
const profiles = [
  { browser: "firefox", name: "Personal", directory: "personal" },
  { browser: "firefox", name: "Work", directory: "work" },
  { browser: "firefox", name: "Unavailable", directory: "unavailable" },
];
const readCookies = jest.fn<CookieReader>();
const listProfiles = jest.fn(() => ({ profiles, note: "Fixture profiles." }));
const request = jest.fn<typeof fetch>();
let server: ReturnType<typeof createMcpServer>;
let client: Client;

beforeEach(async () => {
  jest.clearAllMocks();
  readCookies.mockImplementation(async (_url, selection) => {
    if (selection.profile === "Unavailable") {
      throw new Error("unreadable fixture-secret");
    }
    if (selection.profile !== "Work") {
      return [];
    }
    return [
      {
        domain: "example.com",
        name: "session",
        value: "fixture-secret",
        meta: { browser: "Firefox", file: "work", path: "/api", secure: true },
      },
    ];
  });
  request.mockResolvedValue(new Response("signed in", { status: 200 }));
  server = createMcpServer(
    parseMcpArgs(["--allow-origin", "https://example.com"]),
    {
      readCookies,
      listProfiles,
      fetch: request,
    },
  );
  client = new Client({ name: "mcp-test", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

afterEach(async () => {
  await client.close();
  await server.close();
});

it("reports capabilities without reading browser cookies", async () => {
  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name)).toContain("get_status");
  const result = await client.callTool({ name: "get_status", arguments: {} });
  expect(result.structuredContent).toMatchObject({
    allowedOrigins: ["https://example.com"],
    cookieValuesEnabled: false,
    allowedMethods: ["GET", "HEAD"],
    network: {
      proxyConfigured: expect.any(Boolean),
      nodeUseEnvProxy: expect.any(Boolean),
    },
  });
  expect(readCookies).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
});

it("keeps plain profile discovery compatible and avoids cookie reads", async () => {
  const result = await client.callTool({
    name: "list_profiles",
    arguments: { browser: "firefox" },
  });
  expect(result.structuredContent).toEqual({
    profiles,
    note: "Fixture profiles.",
  });
  expect(listProfiles).toHaveBeenCalledWith("firefox");
  expect(readCookies).not.toHaveBeenCalled();
});

it("finds the matching profile and performs a request through the MCP client", async () => {
  const discovered = await client.callTool({
    name: "list_profiles",
    arguments: { browser: "firefox", url, name: "session" },
  });
  expect(discovered.structuredContent).toMatchObject({
    matchingProfiles: 1,
    profiles: [
      { name: "Personal", cookieCount: 0 },
      { name: "Work", cookieCount: 1 },
      {
        name: "Unavailable",
        cookieCount: null,
        error: { code: "OPERATION_FAILED" },
      },
    ],
  });
  expect(JSON.stringify(discovered)).not.toContain("fixture-secret");
  const selected = (
    discovered.structuredContent as {
      profiles: { name: string; browser: string; cookieCount: number | null }[];
    }
  ).profiles.find((p) => p.cookieCount === 1)!;
  const args = {
    browser: selected.browser,
    profile: selected.name,
    url,
    name: "session",
  };
  const metadata = await client.callTool({
    name: "query_cookies",
    arguments: args,
  });
  expect(metadata.structuredContent).toMatchObject({
    count: 1,
    valuesIncluded: false,
  });
  expect(JSON.stringify(metadata)).not.toContain("fixture-secret");
  const response = await client.callTool({
    name: "authenticated_fetch",
    arguments: args,
  });
  expect(response.structuredContent).toMatchObject({
    status: 200,
    cookiesSent: 1,
    body: "signed in",
  });
  expect(new Headers(request.mock.calls[0]?.[1]?.headers).get("cookie")).toBe(
    "session=fixture-secret",
  );
  expect(request.mock.calls[0]?.[1]?.redirect).toBe("manual");
});

it("checks origin access before inspecting profiles and provides exact setup arguments", async () => {
  const result = await client.callTool({
    name: "list_profiles",
    arguments: {
      url: "https://other.example.com:444/private?token=fixture-secret",
    },
  });
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toMatchObject({
    error: {
      code: "ORIGIN_NOT_ALLOWED",
      message: expect.stringContaining(
        "--allow-origin https://other.example.com:444",
      ),
    },
  });
  expect(JSON.stringify(result)).not.toContain("fixture-secret");
  expect(listProfiles).not.toHaveBeenCalled();
  expect(readCookies).not.toHaveBeenCalled();
});

it("validates cookie filters and forwards Firefox containers", async () => {
  for (const args of [{ name: "session" }, { container: "Work" }]) {
    const result = await client.callTool({
      name: "list_profiles",
      arguments: args,
    });
    expect(result.structuredContent).toMatchObject({
      error: { code: "URL_REQUIRED" },
    });
  }
  const invalid = await client.callTool({
    name: "list_profiles",
    arguments: { url, container: "Work" },
  });
  expect(invalid.structuredContent).toMatchObject({
    error: { code: "FIREFOX_REQUIRED" },
  });
  expect(readCookies).not.toHaveBeenCalled();
  await client.callTool({
    name: "list_profiles",
    arguments: { url, browser: "firefox", container: 3, name: "session" },
  });
  expect(readCookies).toHaveBeenCalledWith(new URL(url), {
    browser: "firefox",
    profile: "Work",
    container: 3,
    name: "session",
  });
});

it("counts only cookies applicable to the destination and exact name", async () => {
  const result = await client.callTool({
    name: "list_profiles",
    arguments: { url: "https://example.com/elsewhere", name: "different" },
  });
  expect(result.structuredContent).toMatchObject({ matchingProfiles: 0 });
});

it("returns actionable transport errors without leaking their raw payloads", async () => {
  request.mockRejectedValue(
    Object.assign(new TypeError("fixture-secret"), {
      cause: Object.assign(new Error("fixture-secret"), { code: "EPERM" }),
    }),
  );
  const result = await client.callTool({
    name: "authenticated_fetch",
    arguments: { url, browser: "firefox", profile: "Work" },
  });
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toMatchObject({
    error: {
      code: "EPERM",
      message: expect.stringContaining("NODE_USE_ENV_PROXY"),
    },
  });
  expect(JSON.stringify(result)).not.toContain("fixture-secret");
});
