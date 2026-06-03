/**
 * Bun-specific entrypoint for @mherod/get-cookie
 *
 * Forces the bun:sqlite adapter, skipping runtime auto-detection.
 * Use this entrypoint when you want deterministic Bun behavior:
 *
 * ```typescript
 * import { getCookie } from "@mherod/get-cookie/bun";
 * ```
 */
import { createBunFileSystemAdapter } from "./core/browsers/runtime/BunFileSystemAdapter";
import { setFileSystemAdapter } from "./core/browsers/runtime/FileSystemAdapter";
import { setRuntimeOverride } from "./core/browsers/sql/adapters/DatabaseAdapter";

setRuntimeOverride("bun");
setFileSystemAdapter(createBunFileSystemAdapter());

export * from "./index";
