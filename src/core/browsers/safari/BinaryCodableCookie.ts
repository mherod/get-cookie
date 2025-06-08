import { Buffer } from "node:buffer";

import {
  type BinaryCookieRow,
  BinaryCookieRowSchema,
} from "../../../types/schemas";
import { createTaggedLogger } from "../../../utils/logHelpers";

import type { BinaryCodableContainer } from "./interfaces/BinaryCodableContainer";
import type { BinaryCodableFlags } from "./interfaces/BinaryCodableFlags";
import type { BinaryCodableOffsets } from "./interfaces/BinaryCodableOffsets";

const logger = createTaggedLogger("BinaryCodableCookie");

/**
 * Represents a single cookie within a page
 */
export class BinaryCodableCookie {
  /**
   *
   */
  public version = 0;
  /**
   *
   */
  public url = "";
  /**
   *
   */
  public port?: number;
  /**
   *
   */
  public name = "";
  /**
   *
   */
  public path = "";
  /**
   *
   */
  public value = "";
  /**
   *
   */
  public comment?: string;
  /**
   *
   */
  public commentURL?: string;
  /**
   *
   */
  public flags: BinaryCodableFlags = {
    isSecure: false,
    isHTTPOnly: false,
    unknown1: false,
    unknown2: false,
  };
  /**
   *
   */
  public expiration = 0;
  /**
   *
   */
  public creation = 0;

  /**
   * Creates a new Cookie instance from a buffer
   * @param buffer - The raw binary cookie data
   */
  public constructor(buffer: Buffer) {
    const container: BinaryCodableContainer = { offset: 0, buffer };
    this.decode(container);
  }

  private decodeUrlValue(value: string): string {
    let processed = value;
    let lastProcessed: string;
    do {
      lastProcessed = processed;
      try {
        processed = decodeURIComponent(processed);
      } catch {
        return lastProcessed;
      }
    } while (processed !== lastProcessed && processed.includes("%"));
    return processed;
  }

  private decodeJwtPayload(token: string): string | null {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    try {
      const payload = Buffer.from(parts[1], "base64").toString("utf8");
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      return JSON.stringify(parsed);
    } catch {
      return null;
    }
  }

  private parseJsonValue(value: string): string | null {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return JSON.stringify(parsed);
    } catch {
      return null;
    }
  }

  private processValue(value: string): string {
    // First, try URL decoding
    const decoded = this.decodeUrlValue(value);

    // Then, try JWT decoding if it looks like a JWT token
    if (decoded.match(/^ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
      const jwtPayload = this.decodeJwtPayload(decoded);
      if (typeof jwtPayload === "string" && jwtPayload.length > 0) {
        return jwtPayload;
      }
    }

    // Finally, try JSON parsing if it looks like JSON
    if (decoded.startsWith("{") || decoded.startsWith("[")) {
      const jsonValue = this.parseJsonValue(decoded);
      if (typeof jsonValue === "string" && jsonValue.length > 0) {
        return jsonValue;
      }
    }

    return decoded;
  }

  /**
   * Validates and converts Mac epoch timestamp to Unix epoch
   * @param macTimestamp - Timestamp in Mac epoch (seconds since 2001-01-01)
   * @returns Unix epoch timestamp or 0 for invalid timestamps
   * @private
   */
  private convertMacTimestamp(macTimestamp: number): number {
    const macToUnixOffset = 978307200; // Seconds between 1970-01-01 and 2001-01-01

    if (macTimestamp <= 0) {
      return macTimestamp;
    }

    // Validate timestamp bounds - reasonable range is 0 to ~1 billion seconds (2032)
    const isValid =
      macTimestamp >= 0 &&
      macTimestamp <= 1000000000 &&
      Number.isFinite(macTimestamp);

    return isValid ? macTimestamp + macToUnixOffset : 0;
  }

  /**
   * Converts the cookie to a validated cookie row
   * @returns Validated cookie row object or null if validation fails
   */
  public toCookieRow(): BinaryCookieRow | null {
    try {
      // Convert flags to number
      const flagsValue = this.convertFlags();

      // Extract domain from URL
      const domain =
        this.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "uk";

      // Convert timestamps from Mac epoch to Unix epoch with validation
      const expiryUnix = this.convertMacTimestamp(this.expiration);
      const creationUnix = this.convertMacTimestamp(this.creation);

      // Create cookie row with converted timestamps
      const cookieRow = BinaryCookieRowSchema.parse({
        name: this.name.replace(/^: /, ""), // Remove leading ': ' if present
        value: this.processValue(this.value) || "", // Process and ensure value is never undefined
        domain,
        path: this.path || "/",
        expiry: expiryUnix,
        creation: creationUnix,
        flags: flagsValue,
        version: this.version,
        port: this.port,
        comment: this.comment,
        commentURL: this.commentURL,
      });

      return cookieRow;
    } catch (_error) {
      return null;
    }
  }

  private readNullTerminatedString(
    container: BinaryCodableContainer,
    offset: number,
  ): string {
    let end = offset;
    while (end < container.buffer.length && container.buffer[end] !== 0) {
      end++;
    }
    const value = container.buffer.toString("utf8", offset, end);
    return value || "";
  }

  private readHeader(container: BinaryCodableContainer): {
    size: number;
    hasPort: number;
    offsets: BinaryCodableOffsets;
  } {
    // Cookie size (4 bytes)
    const size = container.buffer.readUInt32LE(container.offset);
    logger.debug("Cookie size:", size);
    container.offset += 4;

    // Version (4 bytes)
    const version = container.buffer.readUInt32LE(container.offset);
    logger.debug("Cookie version:", version);
    container.offset += 4;

    // Cookie flags (4 bytes)
    const flagsValue = container.buffer.readUInt32LE(container.offset);
    logger.debug("Cookie flags:", flagsValue.toString(2).padStart(8, "0"));
    container.offset += 4;
    this.flags = {
      isSecure: (flagsValue & 1) !== 0,
      isHTTPOnly: (flagsValue & 4) !== 0,
      unknown1: (flagsValue & 8) !== 0,
      unknown2: (flagsValue & 16) !== 0,
    };

    // Has port (4 bytes)
    const hasPort = container.buffer.readUInt32LE(container.offset);
    logger.debug("Has port:", hasPort);
    container.offset += 4;

    // String offsets (24 bytes total)
    const offsets = {
      urlOffset: container.buffer.readUInt32LE(container.offset),
      nameOffset: container.buffer.readUInt32LE(container.offset + 4),
      pathOffset: container.buffer.readUInt32LE(container.offset + 8),
      valueOffset: container.buffer.readUInt32LE(container.offset + 12),
      commentOffset: container.buffer.readUInt32LE(container.offset + 16),
      commentURLOffset: container.buffer.readUInt32LE(container.offset + 20),
    };
    logger.debug("String offsets:", offsets);

    return { size, hasPort, offsets };
  }

  private readTimestamps(container: BinaryCodableContainer): void {
    // Read expiration time (8 bytes, little-endian double)
    const expirationBuffer = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      expirationBuffer[i] = container.buffer[container.offset + i];
    }
    const expiration = expirationBuffer.readDoubleLE(0);
    container.offset += 8;

    // Read creation time (8 bytes, little-endian double)
    const creationBuffer = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      creationBuffer[i] = container.buffer[container.offset + i];
    }
    const creation = creationBuffer.readDoubleLE(0);
    container.offset += 8;

    // Store raw timestamps (seconds since 2001-01-01)
    // For expiration time, 0 means "session cookie" (expires when browser closes)
    // For creation time, 0 means "no creation time recorded"
    this.expiration = expiration;
    this.creation = creation;
  }

  private readStrings(
    container: BinaryCodableContainer,
    size: number,
    offsets: BinaryCodableOffsets,
  ): void {
    // All offsets are relative to the start of the cookie
    const cookieStart = 0; // Offsets are relative to the cookie buffer start
    logger.debug("Reading strings from cookie buffer of size:", size);

    // Read strings in order of their offsets
    const offsetEntries = [
      { field: "url", offset: offsets.urlOffset },
      { field: "name", offset: offsets.nameOffset },
      { field: "path", offset: offsets.pathOffset },
      { field: "value", offset: offsets.valueOffset },
      { field: "comment", offset: offsets.commentOffset },
    ]
      .filter((entry) => entry.offset > 0)
      .sort((a, b) => a.offset - b.offset);

    logger.debug(
      "Reading strings in order:",
      offsetEntries.map((e) => e.field),
    );

    // Calculate string lengths based on offset differences
    for (let i = 0; i < offsetEntries.length; i++) {
      const { field, offset } = offsetEntries[i];
      const nextOffset =
        i < offsetEntries.length - 1 ? offsetEntries[i + 1].offset : size;
      const length = nextOffset - offset;

      // Read string up to null terminator
      let end = cookieStart + offset;
      while (
        end < cookieStart + offset + length &&
        container.buffer[end] !== 0
      ) {
        end++;
      }
      const value = container.buffer.toString(
        "utf8",
        cookieStart + offset,
        end,
      );
      logger.debug(`Read ${field}:`, value);

      switch (field) {
        case "url":
          this.url = value;
          break;
        case "name":
          this.name = value;
          break;
        case "path":
          this.path = value;
          break;
        case "value":
          this.value = value;
          break;
        case "comment":
          this.comment = value;
          break;
      }
    }
  }

  private decode(container: BinaryCodableContainer): void {
    const { size, hasPort, offsets } = this.readHeader(container);

    // Skip past all offsets (24 bytes)
    const baseOffset = container.offset;
    container.offset = baseOffset + 24;

    this.readTimestamps(container);

    if (hasPort > 0) {
      this.port = container.buffer.readUInt16LE(container.offset);
      container.offset += 2;
    }

    // Reset offset for string reading
    container.offset = baseOffset;
    this.readStrings(container, size, offsets);
  }

  private convertFlags(): number {
    return (
      (this.flags.isSecure ? 0x1 : 0) |
      (this.flags.isHTTPOnly ? 0x4 : 0) |
      (this.flags.unknown1 ? 0x8 : 0) |
      (this.flags.unknown2 ? 0x10 : 0)
    );
  }
}
