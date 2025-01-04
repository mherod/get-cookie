import { Buffer } from 'buffer';

/**
 * Container for binary data parsing with offset tracking
 */
export interface BinaryCodableContainer {
  offset: number;
  buffer: Buffer;
}