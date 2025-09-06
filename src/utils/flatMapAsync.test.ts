import { flatMapAsync } from "./flatMapAsync";

describe("flatMapAsync", () => {
  it("should apply callback to each element and flatten the array", async () => {
    const array = [1, 2, 3];
    const callback = async (value: number): Promise<number[]> =>
      Promise.resolve([value, value * 2]);
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2, 2, 4, 3, 6]);
  });

  it("should handle errors with the provided error callback", async () => {
    const array = [1, 2, 3];
    const callback = async (value: number): Promise<number[]> => {
      if (value === 2) {
        return Promise.reject(new Error("Test error"));
      }
      return Promise.resolve([value, value * 2]);
    };
    const result = await flatMapAsync(array, callback, [0]);
    expect(result).toEqual([1, 2, 0, 3, 6]);
  });
});

describe("flatMapAsync edge cases", () => {
  it("should return an empty array when input array is empty", async () => {
    const array: number[] = [];
    const callback = async (value: number): Promise<number[]> =>
      Promise.resolve([value, value * 2]);
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([]);
  });

  it("should return an array with single element when input array has one element", async () => {
    const array = [1];
    const callback = async (value: number): Promise<number[]> =>
      Promise.resolve([value, value * 2]);
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2]);
  });
});

describe("flatMapAsync null/undefined handling", () => {
  it("should handle null values in the array", async () => {
    const array = [1, null, 3];
    const callback = async (value: number | null): Promise<number[]> => {
      if (value === null || value === 0) {
        return Promise.resolve([0]);
      }
      return Promise.resolve([value, value * 2]);
    };
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2, 0, 3, 6]);
  });

  it("should handle undefined values in the array", async () => {
    const array = [1, undefined, 3];
    const callback = async (value: number | undefined): Promise<number[]> => {
      if (value === undefined || value === 0) {
        return Promise.resolve([0]);
      }
      return Promise.resolve([value, value * 2]);
    };
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2, 0, 3, 6]);
  });
});
