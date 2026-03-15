/**
 * Node.js-specific entrypoint for @mherod/get-cookie
 *
 * Forces the better-sqlite3 adapter, skipping runtime auto-detection.
 * Use this entrypoint when you want deterministic Node.js behavior:
 *
 * ```typescript
 * import { getCookie } from "@mherod/get-cookie/node";
 * ```
 */
import { setRuntimeOverride } from "./core/browsers/sql/adapters/DatabaseAdapter";

setRuntimeOverride("node");

export * from "./index";
