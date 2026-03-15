/**
 * Tests for runtime override and entrypoint resolution
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

import { getCurrentRuntime, setRuntimeOverride } from "../DatabaseAdapter";

describe("setRuntimeOverride", () => {
  beforeEach(() => {
    // Reset override to auto-detect between tests
    setRuntimeOverride(undefined);
  });

  it("should default to 'node' when no override is set and globalThis.Bun is absent", () => {
    // In Jest (Node.js), globalThis.Bun is undefined, so auto-detect returns "node"
    expect(getCurrentRuntime()).toBe("node");
  });

  it("should return 'node' when override is set to node", () => {
    setRuntimeOverride("node");
    expect(getCurrentRuntime()).toBe("node");
  });

  it("should return 'bun' when override is set to bun", () => {
    setRuntimeOverride("bun");
    expect(getCurrentRuntime()).toBe("bun");
  });

  it("should revert to auto-detect when override is cleared", () => {
    setRuntimeOverride("bun");
    expect(getCurrentRuntime()).toBe("bun");

    setRuntimeOverride(undefined);
    // Back to auto-detect: "node" in Jest
    expect(getCurrentRuntime()).toBe("node");
  });
});
