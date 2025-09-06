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
 * Handles decoding of Safari's binary cookie format
 */
export class BinaryCodableCookie {
  /**
   * Cookie version number
   */
  public version = 0;

  /**
   * URL the cookie is associated with
   */
  public url = "";

  /**
   * Port number if specified
   */
  public port?: number;

  /**
   * Cookie name
   */
  public name = "";

  /**
   * Cookie path
   */
  public path = "";

  /**
   * Cookie value
   */
  public value = "";

  /**
   * Optional comment
   */
  public comment?: string;

  /**
   * Optional comment URL
   */
  public commentURL?: string;

  /**
   * Cookie flags (secure, httpOnly, etc.)
   */
  public flags: BinaryCodableFlags = {
    isSecure: false,
    isHTTPOnly: false,
    unknown1: false,
    unknown2: false,
  };

  /**
   * Expiration timestamp (Mac epoch seconds)
   */
  public expiration = 0;

  /**
   * Creation timestamp (Mac epoch seconds)
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

  /**
   * Decode URL encoded values with multiple passes
   * @param value - The URL encoded string
   * @returns Decoded string
   */
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

  /**
   * Decode JWT payload if the value is a valid JWT token
   * @param token - The JWT token string
   * @returns Decoded payload as JSON string or null if invalid
   */
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

  /**
   * Parse JSON value and return formatted JSON string
   * @param value - The JSON string to parse
   * @returns Formatted JSON string or null if invalid
   */
  private parseJsonValue(value: string): string | null {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return JSON.stringify(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Process cookie value with appropriate decoding
   * @param value - The raw cookie value
   * @returns Processed and decoded value as string
   */
  private processValue(value: unknown): string {
    // Handle non-string values
    const primitiveResult = this.handlePrimitiveValues(value);
    if (primitiveResult !== null) {
      return primitiveResult;
    }

    // Must be a string at this point
    const stringValue = value as string;

    // First, try URL decoding
    const decoded = this.decodeUrlValue(stringValue);

    // Try specialized decoding
    return this.trySpecializedDecoding(decoded);
  }

  /**
   * Handle primitive value types (null, undefined, buffer, non-string)
   * @param value - The value to check
   * @returns String representation or null if not a primitive type
   */
  private handlePrimitiveValues(value: unknown): string | null {
    if (value === null) {
      return "null";
    }

    if (value === undefined) {
      return "undefined";
    }

    if (Buffer.isBuffer(value)) {
      return value.toString();
    }

    if (typeof value !== "string") {
      return this.safeStringify(value);
    }

    return null; // Not a primitive type
  }

  /**
   * Try specialized decoding (JWT, JSON) on the decoded string
   * @param decoded - The URL-decoded string
   * @returns Specialized decoded value or the original decoded string
   */
  private trySpecializedDecoding(decoded: string): string {
    // Try JWT decoding if it looks like a JWT token
    const jwtResult = this.tryJwtDecoding(decoded);
    if (jwtResult !== null) {
      return jwtResult;
    }

    // Try JSON parsing if it looks like JSON
    const jsonResult = this.tryJsonDecoding(decoded);
    if (jsonResult !== null) {
      return jsonResult;
    }

    return decoded;
  }

  /**
   * Try JWT decoding if the value looks like a JWT token
   * @param decoded - The decoded string to check
   * @returns Decoded JWT payload or null if not a JWT or decoding failed
   */
  private tryJwtDecoding(decoded: string): string | null {
    if (decoded.match(/^ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
      const jwtPayload = this.decodeJwtPayload(decoded);
      if (typeof jwtPayload === "string" && jwtPayload.length > 0) {
        return jwtPayload;
      }
    }
    return null;
  }

  /**
   * Try JSON decoding if the value looks like JSON
   * @param decoded - The decoded string to check
   * @returns Decoded JSON string or null if not JSON or decoding failed
   */
  private tryJsonDecoding(decoded: string): string | null {
    if (decoded.startsWith("{") || decoded.startsWith("[")) {
      const jsonValue = this.parseJsonValue(decoded);
      if (typeof jsonValue === "string" && jsonValue.length > 0) {
        return jsonValue;
      }
    }
    return null;
  }

  /**
   * Safely convert unknown value to string
   * @param value - The value to stringify
   * @returns String representation of the value
   */
  private safeStringify(value: unknown): string {
    try {
      if (typeof value === "object" && value !== null) {
        // For objects, use JSON.stringify if possible, otherwise use toString
        return JSON.stringify(value);
      }
      return String(value);
    } catch {
      // Fallback to String() if JSON.stringify fails
      return String(value);
    }
  }

  /**
   * Validates and converts Mac epoch timestamp to Unix epoch
   * @param macTimestamp - Timestamp in Mac epoch (seconds since 2001-01-01)
   * @returns Unix epoch timestamp or 0 for invalid timestamps
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

  /**
   * Read a null-terminated string from the container buffer
   * @param container - The binary container
   * @param offset - Starting offset in the buffer
   * @returns The null-terminated string
   */
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

  /**
   * Read the cookie header information
   * @param container - The binary container
   * @returns Object containing size, port flag, and string offsets
   */
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

  /**
   * Read expiration and creation timestamps from the container
   * @param container - The binary container
   */
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

  /**
   * Read cookie string fields from the container
   * @param container - The binary container
   * @param size - Total size of the cookie
   * @param offsets - String field offsets
   */
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

  /**
   * Decode the cookie from the binary container
   * @param container - The binary container with cookie data
   */
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

  /**
   * Convert cookie flags to numeric representation
   * @returns Numeric flags value
   */
  private convertFlags(): number {
    return (
      (this.flags.isSecure ? 0x1 : 0) |
      (this.flags.isHTTPOnly ? 0x4 : 0) |
      (this.flags.unknown1 ? 0x8 : 0) |
      (this.flags.unknown2 ? 0x10 : 0)
    );
  }
}
