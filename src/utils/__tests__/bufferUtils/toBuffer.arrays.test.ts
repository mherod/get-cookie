import { toBuffer } from "../../bufferUtils";

describe("toBuffer - array types", () => {
  it("should handle array input", () => {
    const input = [1, 2, 3, 4];
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3, 4]);
  });

  it("should handle array with various number types", () => {
    const input = [1, -2, 3.14, -4.5, 255, 256];
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(input.length);
  });

  it("should handle nested arrays", () => {
    const input = [
      [1, 2],
      [3, 4],
    ];
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3, 4]);
  });

  it("should handle TypedArray input", () => {
    const input = new Uint8Array([1, 2, 3, 4]);
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3, 4]);
  });

  it("should handle different TypedArray types", () => {
    const inputs = [
      new Int8Array([1, -2, 3, -4]),
      new Uint16Array([1000, 2000]),
      new Int32Array([100000, -200000]),
      new Float32Array([1.5, -2.5]),
      new Float64Array([1.23456789, -9.87654321]),
    ];

    for (const input of inputs) {
      const result = toBuffer(input);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    }
  });
});
