/**
 * Node.js filesystem adapter implementation
 *
 * Backs {@link ./FileSystemAdapter.FileSystemAdapter} with `node:fs` synchronous
 * primitives. Wired by the `@mherod/get-cookie/node` entrypoint, and also used
 * as the lazy default for the base entry. Bun implements `node:fs` natively, so
 * this adapter is a correct synchronous implementation under Bun as well.
 */

import { closeSync, existsSync, openSync, readSync } from "node:fs";

import { createTaggedLogger } from "@utils/logHelpers";

import type { FileSystemAdapter } from "./FileSystemAdapter";

const logger = createTaggedLogger("NodeFileSystemAdapter");

/**
 * Create a {@link FileSystemAdapter} backed by `node:fs`.
 * @returns A Node-backed filesystem adapter
 */
export function createNodeFileSystemAdapter(): FileSystemAdapter {
  return {
    fileExists(path: string): boolean {
      return existsSync(path);
    },

    readLeadingBytes(path: string, length: number): Buffer | null {
      let fd: number | undefined;
      try {
        fd = openSync(path, "r");
        const buffer = Buffer.alloc(length);
        const bytesRead = readSync(fd, buffer, 0, length, 0);
        return bytesRead < length ? buffer.subarray(0, bytesRead) : buffer;
      } catch (error) {
        logger.debug("Failed to read leading bytes", { path, length, error });
        return null;
      } finally {
        if (fd !== undefined) {
          closeSync(fd);
        }
      }
    },
  };
}
