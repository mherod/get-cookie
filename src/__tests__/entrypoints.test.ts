/**
 * Smoke tests for runtime-specific entrypoints
 * Verifies that @mherod/get-cookie/node and @mherod/get-cookie/bun
 * export the same public API surface as the root entrypoint.
 */

import { describe, it, expect } from "@jest/globals";

import * as rootExports from "../index";
import * as nodeExports from "../node";

describe("entrypoint exports", () => {
  const expectedExports = Object.keys(rootExports).sort();

  it("root entrypoint should export core API symbols", () => {
    expect(expectedExports).toContain("getCookie");
    expect(expectedExports).toContain("ChromeCookieQueryStrategy");
    expect(expectedExports).toContain("FirefoxCookieQueryStrategy");
    expect(expectedExports).toContain("SafariCookieQueryStrategy");
    expect(expectedExports).toContain("CompositeCookieQueryStrategy");
    expect(expectedExports).toContain("batchGetCookies");
  });

  it("node entrypoint should export the same symbols as root", () => {
    const nodeKeys = Object.keys(nodeExports).sort();
    expect(nodeKeys).toEqual(expectedExports);
  });

  it("node entrypoint should set runtime to 'node'", () => {
    // Importing src/node.ts calls setRuntimeOverride("node")
    // which makes getCurrentRuntime() return "node"
    const { getCurrentRuntime } =
      require("../core/browsers/sql/adapters/DatabaseAdapter") as typeof import("../core/browsers/sql/adapters/DatabaseAdapter");
    expect(getCurrentRuntime()).toBe("node");
  });
});
