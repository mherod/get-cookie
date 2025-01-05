import { toBuffer } from "../../bufferUtils";

describe("toBuffer - binary types", () => {
  it("should handle ArrayBuffer input", () => {
    const input = new ArrayBuffer(4);
    const view = new Uint8Array(input);
    view.set([1, 2, 3, 4]);
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3, 4]);
  });

  it("should handle SharedArrayBuffer input", () => {
    const input = new SharedArrayBuffer(4);
    const view = new Uint8Array(input);
    view.set([1, 2, 3, 4]);
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3, 4]);
  });

  it("should handle DataView input", () => {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setInt8(0, 1);
    view.setInt8(1, 2);
    view.setInt8(2, 3);
    view.setInt8(3, 4);
    const result = toBuffer(view);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3, 4]);
  });

  it("should handle very large binary data", () => {
    const input = new ArrayBuffer(1000000);
    const view = new Uint8Array(input);
    for (let i = 0; i < view.length; i++) {
      view[i] = i % 256;
    }
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(1000000);
    expect([...result].slice(0, 4)).toEqual([0, 1, 2, 3]);
  });
});
