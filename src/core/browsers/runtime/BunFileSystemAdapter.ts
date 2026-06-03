/**
 * Bun filesystem adapter implementation
 *
 * Wired by the `@mherod/get-cookie/bun` entrypoint.
 *
 * Bun exposes no synchronous `BunFile` content read — `Bun.file(path).bytes()`
 * and `.arrayBuffer()` are async, and only `.size` is synchronous. Browser
 * detection's magic-byte sniff is synchronous (it runs inside the sync
 * `detectBrowserFromStore` path), so the only correct option under Bun is
 * `node:fs`, which Bun implements natively. This adapter therefore composes the
 * Node implementation. It exists as a distinct, named adapter so the Bun
 * entrypoint can wire Bun-specific behaviour here if an async read path is ever
 * introduced.
 */

import type { FileSystemAdapter } from "./FileSystemAdapter";
import { createNodeFileSystemAdapter } from "./NodeFileSystemAdapter";

/**
 * Create a {@link FileSystemAdapter} for the Bun runtime.
 * @returns A Bun-runtime filesystem adapter (backed by Bun's native `node:fs`)
 */
export function createBunFileSystemAdapter(): FileSystemAdapter {
  return createNodeFileSystemAdapter();
}
