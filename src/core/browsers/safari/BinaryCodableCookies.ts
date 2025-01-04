import { Buffer } from 'buffer';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { BinaryCookieRow } from '../../../types/schemas';
import { logWarn } from '../../../utils/logHelpers';

import { BinaryCodablePage } from './BinaryCodablePage';
import { BinaryCodableContainer } from './interfaces/BinaryCodableContainer';

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
  private static readonly MAGIC = Buffer.from('cook', 'utf8');
  private static readonly FOOTER = BigInt('0x071720050000004b');
  private static readonly DEFAULT_COOKIE_PATH = join(
    homedir(),
    'Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies'
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
    return BinaryCodableCookies.fromFile(BinaryCodableCookies.DEFAULT_COOKIE_PATH);
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        logWarn('BinaryCookies', 'Error converting page cookies', { error: errorMessage });
      }
    }

    return cookies;
  }

  private readMagic(container: BinaryCodableContainer): void {
    const magic = container.buffer.subarray(container.offset, container.offset + 4);
    container.offset += 4;
    if (!magic.equals(BinaryCodableCookies.MAGIC)) {
      throw new Error('Missing magic value');
    }
  }

  private readPageSizes(container: BinaryCodableContainer): number[] {
    const pageCount = container.buffer.readUInt32LE(container.offset);
    container.offset += 4;

    const pageSizes: number[] = [];
    for (let i = 0; i < pageCount; i++) {
      if (container.offset + 4 > container.buffer.length) {
        logWarn('BinaryCookies', 'Buffer overflow while reading page sizes');
        break;
      }
      pageSizes.push(container.buffer.readUInt32LE(container.offset));
      container.offset += 4;
    }
    return pageSizes;
  }

  private readPages(container: BinaryCodableContainer, pageSizes: number[]): void {
    let currentOffset = container.offset;
    for (const pageSize of pageSizes) {
      if (currentOffset + pageSize > container.buffer.length) {
        logWarn('BinaryCookies', 'Buffer overflow while reading page');
        break;
      }
      try {
        const pageBuffer = container.buffer.subarray(currentOffset, currentOffset + pageSize);
        const page = new BinaryCodablePage(pageBuffer);
        this.pages.push(page);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logWarn('BinaryCookies', `Error decoding page`, { error: errorMessage });
      }
      currentOffset += pageSize;
    }
    container.offset = currentOffset;
  }

  private readFooter(container: BinaryCodableContainer): void {
    if (container.offset + 4 <= container.buffer.length) {
      const _checksum = container.buffer.readUInt32LE(container.offset);
      container.offset += 4;
    }

    if (container.offset + 8 <= container.buffer.length) {
      const footer = container.buffer.readBigUInt64LE(container.offset);
      container.offset += 8;
      if (footer !== BinaryCodableCookies.FOOTER) {
        logWarn('BinaryCookies', 'Invalid cookie file format: wrong footer');
      }
    }
  }

  private readMetadata(container: BinaryCodableContainer): void {
    if (container.offset < container.buffer.length) {
      const _plistData = container.buffer.subarray(container.offset);
      // Note: You'll need to implement or use a plist parser library here
      this.metadata = {}; // Placeholder for plist data
    }
  }

  private decode(container: BinaryCodableContainer): void {
    try {
      this.readMagic(container);
      const pageSizes = this.readPageSizes(container);
      this.readPages(container, pageSizes);
      this.readFooter(container);
      this.readMetadata(container);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logWarn('BinaryCookies', 'Error decoding binary cookies file', { error: errorMessage });
      throw error;
    }
  }
}
