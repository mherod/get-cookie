import type { Buffer } from "node:buffer";

import type { BinaryCookieRow } from "../../../types/schemas";
import { logWarn } from "../../../utils/logHelpers";
import { createTaggedLogger } from "../../../utils/logHelpers";

import { BinaryCodableCookie } from "./BinaryCodableCookie";
import type { BinaryCodableContainer } from "./interfaces/BinaryCodableContainer";

const logger = createTaggedLogger("BinaryCodablePage");

/**
 * Represents a page of cookies within the binary cookies file
 */
export class BinaryCodablePage {
  /**
   *
   */
  public cookies: BinaryCodableCookie[];
  private static readonly HEADER = 0x00000100;
  private static readonly FOOTER = 0x00000000;

  /**
   * Creates a new Page instance from a buffer
   * @param buffer - The raw binary page data
   */
  public constructor(buffer: Buffer) {
    this.cookies = [];
    const container: BinaryCodableContainer = { offset: 0, buffer };
    this.decode(container);
  }

  /**
   * Converts the page's cookies into validated cookie rows
   * @returns Array of validated cookie objects
   */
  public toCookieRows(): BinaryCookieRow[] {
    const cookies: BinaryCookieRow[] = [];

    for (const cookie of this.cookies) {
      try {
        const cookieRow = cookie.toCookieRow();
        if (cookieRow !== null) {
          cookies.push(cookieRow);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logWarn("BinaryCookies", "Error converting cookie", {
          error: errorMessage,
        });
      }
    }

    return cookies;
  }

  private decode(container: BinaryCodableContainer): void {
    // Read page tag (4 bytes)
    const header = container.buffer.readUInt32BE(container.offset);
    logger.debug("Page header:", header.toString(16));
    container.offset += 4;
    if (header !== BinaryCodablePage.HEADER) {
      throw new Error("Invalid page header");
    }

    // Read number of cookies (4 bytes)
    const cookieCount = container.buffer.readUInt32LE(container.offset);
    logger.debug("Cookie count:", cookieCount);
    container.offset += 4;

    // Store the page start offset for calculating absolute cookie positions
    const pageStart = container.offset - 8;
    logger.debug("Page start offset:", pageStart);

    // Read cookie offsets (4 bytes each)
    const cookieOffsets: number[] = [];
    for (let i = 0; i < cookieCount; i++) {
      const cookieOffset = container.buffer.readUInt32LE(container.offset);
      cookieOffsets.push(cookieOffset);
      logger.debug(`Cookie ${i} offset:`, cookieOffset);
      container.offset += 4;
    }

    // Read page end marker (4 bytes)
    const footer = container.buffer.readUInt32BE(container.offset);
    logger.debug("Page footer:", footer.toString(16));
    container.offset += 4;
    if (footer !== BinaryCodablePage.FOOTER) {
      throw new Error("Invalid page footer");
    }

    // Read cookies at their offsets
    for (let i = 0; i < cookieCount; i++) {
      try {
        const cookieOffset = cookieOffsets[i];
        logger.debug(`Reading cookie ${i} at offset:`, cookieOffset);

        // Read cookie size from the cookie header
        const cookieSize = container.buffer.readUInt32LE(cookieOffset);
        logger.debug(`Cookie ${i} size:`, cookieSize);
        if (cookieSize < 48) {
          // Minimum cookie size is 48 bytes (header)
          logger.warn(`Invalid cookie size ${cookieSize} at index ${i}`);
          continue;
        }

        // Ensure we don't read past the buffer
        if (cookieOffset + cookieSize > container.buffer.length) {
          logger.warn(
            `Cookie size ${cookieSize} at index ${i} would exceed buffer length ${container.buffer.length}`,
          );
          continue;
        }

        const cookieBuffer = container.buffer.subarray(
          cookieOffset,
          cookieOffset + cookieSize,
        );
        const cookie = new BinaryCodableCookie(cookieBuffer);
        this.cookies.push(cookie);
      } catch (error) {
        logger.warn("Invalid cookie data", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
