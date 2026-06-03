/**
 * Filesystem adapter abstraction layer
 *
 * Provides a unified, runtime-injectable interface for the small amount of
 * synchronous disk access that browser detection needs (checking a store path
 * exists and sniffing a file's leading "magic" bytes).
 *
 * Mirrors the SQLite {@link ./../sql/adapters/DatabaseAdapter} design: the
 * `@mherod/get-cookie/node` and `@mherod/get-cookie/bun` entrypoints call
 * {@link setFileSystemAdapter} to wire the runtime-appropriate implementation,
 * keeping `node:fs` imports out of the universal entry graph and off of
 * detection logic such as {@link ./../BrowserDetector}.
 */

/**
 * Minimal synchronous filesystem surface required by browser detection.
 */
export interface FileSystemAdapter {
  /**
   * Check whether a path exists on disk.
   * @param path - Absolute or relative path to test
   * @returns True when the path exists
   */
  fileExists(path: string): boolean;

  /**
   * Read the leading bytes of a file without loading the whole file.
   *
   * Used to sniff format signatures (e.g. Safari's `cook` binary cookie magic
   * bytes) cheaply, even when the underlying store is large.
   *
   * @param path - Path to the file to read
   * @param length - Number of bytes to read from the start of the file
   * @returns A buffer of up to `length` bytes, or `null` if the read failed
   */
  readLeadingBytes(path: string, length: number): Buffer | null;
}

/**
 * Active adapter, injected by an entrypoint via {@link setFileSystemAdapter}.
 * When unset, {@link getFileSystemAdapter} lazily falls back to the Node
 * implementation so the default `@mherod/get-cookie` entry works standalone.
 */
let currentAdapter: FileSystemAdapter | undefined;

/**
 * Inject the filesystem implementation to use for browser detection.
 *
 * Called by the `@mherod/get-cookie/node` and `@mherod/get-cookie/bun`
 * entrypoints so consumers get deterministic, runtime-appropriate disk access
 * without relying on auto-detection.
 *
 * @param adapter - The adapter to use, or `undefined` to clear the override
 */
export function setFileSystemAdapter(
  adapter: FileSystemAdapter | undefined,
): void {
  currentAdapter = adapter;
}

/**
 * Resolve the active filesystem adapter.
 *
 * Returns the injected adapter when an entrypoint has set one; otherwise lazily
 * loads the Node implementation. The Node adapter relies only on `node:fs`,
 * which Bun also implements natively, so it is a safe synchronous default for
 * either runtime.
 *
 * @returns The filesystem adapter to use
 */
export function getFileSystemAdapter(): FileSystemAdapter {
  if (currentAdapter !== undefined) {
    return currentAdapter;
  }

  // Lazily require the Node adapter so `node:fs` is only pulled in on first
  // use, keeping it out of the static import graph of the base bundle.
  const { createNodeFileSystemAdapter } =
    require("./NodeFileSystemAdapter") as typeof import("./NodeFileSystemAdapter");
  const adapter = createNodeFileSystemAdapter();
  currentAdapter = adapter;
  return adapter;
}
