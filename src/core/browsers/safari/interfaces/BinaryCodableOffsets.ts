/**
 * Offsets for various string fields within a cookie
 */
export interface BinaryCodableOffsets {
  urlOffset: number;
  nameOffset: number;
  pathOffset: number;
  valueOffset: number;
  commentOffset: number;
  commentURLOffset: number;
}
