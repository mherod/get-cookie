/**
 * Smoke tests for runtime-specific entrypoints
 * Verifies that @mherod/get-cookie/node and @mherod/get-cookie/bun
 * export the same public API surface as the root entrypoint.
 */

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import * as rootExports from "../index";

describe("entrypoint exports", () => {
  const expectedExports = Object.keys(rootExports).sort();
  const loadRuntimeAdapter = () =>
    require("../core/browsers/sql/adapters/DatabaseAdapter") as typeof import("../core/browsers/sql/adapters/DatabaseAdapter");

  beforeEach(() => {
    jest.resetModules();
    loadRuntimeAdapter().setRuntimeOverride(undefined);
  });

  afterAll(() => {
    loadRuntimeAdapter().setRuntimeOverride(undefined);
    jest.resetModules();
  });

  it("root entrypoint should export core API symbols", () => {
    expect(expectedExports).toContain("getCookie");
    expect(expectedExports).toContain("ChromeCookieQueryStrategy");
    expect(expectedExports).toContain("FirefoxCookieQueryStrategy");
    expect(expectedExports).toContain("SafariCookieQueryStrategy");
    expect(expectedExports).toContain("CompositeCookieQueryStrategy");
    expect(expectedExports).toContain("batchGetCookies");
  });

  it("node entrypoint should export the same symbols as root", () => {
    // Use require() so the entrypoint's module-level override runs in the
    // current reset module graph instead of leaking across test files.
    const nodeExports = require("../node") as typeof import("../node");
    const nodeKeys = Object.keys(nodeExports).sort();
    expect(nodeKeys).toEqual(expectedExports);
  });

  it("node entrypoint should set runtime to 'node'", () => {
    require("../node");
    const { getCurrentRuntime } = loadRuntimeAdapter();
    expect(getCurrentRuntime()).toBe("node");
  });

  it("bun entrypoint should export the same symbols as root", () => {
    const bunExports = require("../bun") as typeof import("../bun");
    const bunKeys = Object.keys(bunExports).sort();
    expect(bunKeys).toEqual(expectedExports);
  });

  it("bun entrypoint should set runtime to 'bun'", () => {
    require("../bun");
    const { getCurrentRuntime } = loadRuntimeAdapter();
    expect(getCurrentRuntime()).toBe("bun");
  });
});
