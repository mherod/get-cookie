import { Buffer } from "buffer";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import { BinaryCookieRow } from "../../../types/schemas";
import { logWarn, createTaggedLogger } from "../../../utils/logHelpers";

import { BinaryCodablePage } from "./BinaryCodablePage";
import { BinaryCodableContainer } from "./interfaces/BinaryCodableContainer";

const logger = createTaggedLogger("BinaryCodableCookies");

/**
 * Represents a binary cookies file structure used by Safari
 */
export class BinaryCodableCookies {
  /**
   *
   */
  public pages: BinaryCodablePage[];
  /**
   *
   */
  public metadata: Record<string, unknown>;
  private static readonly MAGIC = Buffer.from("cook", "utf8");
  private static readonly FOOTER = BigInt("0x071720050000004b");
  private static readonly DEFAULT_COOKIE_PATH = join(
    homedir(),
    "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
  );

  /**
   * Creates a new BinaryCookies instance from a buffer
   * @param buffer - The raw binary cookie file data
   */
  public constructor(buffer: Buffer) {
    const container: BinaryCodableContainer = { offset: 0, buffer };
    this.pages = [];
    this.metadata = {};
    this.decode(container);
  }

  /**
   * Creates a BinaryCookies instance from a file path
   * @param path - Path to the Safari Cookies.binarycookies file
   * @returns A new BinaryCookies instance
   */
  public static fromFile(path: string): BinaryCodableCookies {
    const buffer = readFileSync(path);
    return new BinaryCodableCookies(buffer);
  }

  /**
   * Creates a BinaryCookies instance from the default Safari cookies location
   * @returns A new BinaryCookies instance
   */
  public static fromDefaultPath(): BinaryCodableCookies {
    return BinaryCodableCookies.fromFile(
      BinaryCodableCookies.DEFAULT_COOKIE_PATH,
    );
  }

  /**
   * Converts the binary cookie data into a validated array of cookie rows
   * @returns Array of validated cookie objects
   */
  public toCookieRows(): BinaryCookieRow[] {
    const cookies: BinaryCookieRow[] = [];

    for (const page of this.pages) {
      try {
        const pageCookies = page.toCookieRows();
        if (Array.isArray(pageCookies)) {
          cookies.push(...pageCookies);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logWarn("BinaryCookies", "Error converting page cookies", {
          error: errorMessage,
        });
      }
    }

    return cookies;
  }

  private decode(container: BinaryCodableContainer): void {
    try {
      // Check magic value
      const magic = container.buffer.subarray(
        container.offset,
        container.offset + 4,
      );
      container.offset += 4;
      logger.debug("Magic bytes:", magic.toString());
      if (!magic.equals(BinaryCodableCookies.MAGIC)) {
        throw new Error("Missing magic value");
      }

      // Read page count
      const pageCount = container.buffer.readUInt32BE(container.offset);
      logger.debug("Page count:", pageCount);
      container.offset += 4;

      // Read page sizes
      const pageSizes: number[] = [];
      for (let i = 0; i < pageCount; i++) {
        const pageSize = container.buffer.readUInt32BE(container.offset);
        pageSizes.push(pageSize);
        logger.debug(`Page ${i} size:`, pageSize);
        container.offset += 4;
      }

      // Calculate page offsets
      let currentOffset = container.offset;
      logger.debug("Starting page data at offset:", currentOffset);
      for (const pageSize of pageSizes) {
        try {
          logger.debug(
            "Reading page at offset:",
            currentOffset,
            "with size:",
            pageSize,
          );
          const pageBuffer = container.buffer.subarray(
            currentOffset,
            currentOffset + pageSize,
          );
          const page = new BinaryCodablePage(pageBuffer);
          this.pages.push(page);
          currentOffset += pageSize;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.warn("Error decoding page:", { error: errorMessage });
          currentOffset += pageSize; // Skip the problematic page
        }
      }
      container.offset = currentOffset;

      // Read checksum
      const checksum = container.buffer.readUInt32BE(container.offset);
      logger.debug("Checksum:", checksum.toString(16));
      container.offset += 4;

      // Read footer
      const footer = container.buffer.readBigUInt64BE(container.offset);
      logger.debug("Footer:", footer.toString(16));
      container.offset += 8;
      if (footer !== BinaryCodableCookies.FOOTER) {
        logWarn("BinaryCookies", "Invalid cookie file format: wrong footer");
      }

      // Read metadata plist
      const _plistData = container.buffer.subarray(container.offset);
      // Note: You'll need to implement or use a plist parser library here
      this.metadata = {}; // Placeholder for plist data
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logWarn("BinaryCookies", "Error decoding binary cookies file", {
        error: errorMessage,
      });
      throw error;
    }
  }
}
