import { flatMapAsync } from "./flatMapAsync";

describe("flatMapAsync", () => {
  it("should apply async callback to each element, wait for all promises to fulfill and flatten the resulting array", async () => {
    const array = [1, 2, 3];
    const callback = async (value: number) => [value, value * 2];
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2, 2, 4, 3, 6]);
  });

  it("should handle errors with the provided error callback", async () => {
    const array = [1, 2, 3];
    const callback = async (value: number) => {
      if (value === 2) {
        throw new Error("Test error");
      }
      return [value, value * 2];
    };
    const errorCallback = (error: any) => [0];
    const result = await flatMapAsync(array, callback, errorCallback);
    expect(result).toEqual([1, 2, 0, 3, 6]);
  });

  it("should return an empty array when input array is empty", async () => {
    const array: number[] = [];
    const callback = async (value: number) => [value, value * 2];
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([]);
  });

  it("should return an array with single element when input array has one element", async () => {
    const array = [1];
    const callback = async (value: number) => [value, value * 2];
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2]);
  });

  it("should handle null values in the array", async () => {
    const array = [1, null, 3];
    const callback = async (value: number) =>
      value ? [value, value * 2] : [0];
    // @ts-expect-error
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2, 0, 3, 6]);
  });

  it("should handle undefined values in the array", async () => {
    const array = [1, undefined, 3];
    const callback = async (value: number) =>
      value ? [value, value * 2] : [0];
    // @ts-expect-error
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2, 0, 3, 6]);
  });
});
