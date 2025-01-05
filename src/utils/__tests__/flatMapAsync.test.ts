import { flatMapAsync } from "../flatMapAsync";

describe("flatMapAsync", () => {
  it("should apply callback to each element and flatten the array", async () => {
    const array = [1, 2, 3];
    const callback = (value: number): Promise<number[]> =>
      Promise.resolve([value, value * 2]);
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2, 2, 4, 3, 6]);
  });

  it("should handle errors with the provided error callback", async () => {
    const array = [1, 2, 3];
    const callback = (value: number): Promise<number[]> => {
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
    const callback = (value: number): Promise<number[]> =>
      Promise.resolve([value, value * 2]);
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([]);
  });

  it("should return an array with single element when input array has one element", async () => {
    const array = [1];
    const callback = (value: number): Promise<number[]> =>
      Promise.resolve([value, value * 2]);
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2]);
  });

  it("should handle very large arrays", async () => {
    const array = Array.from({ length: 1000 }, (_, i) => i);
    const callback = (value: number): Promise<number[]> =>
      Promise.resolve([value]);
    const result = await flatMapAsync(array, callback);
    expect(result).toHaveLength(1000);
    expect(result[0]).toBe(0);
    expect(result[999]).toBe(999);
  });
});

describe("flatMapAsync null/undefined handling", () => {
  it("should handle null values in the array", async () => {
    const array = [1, null, 3];
    const callback = (value: number | null): Promise<number[]> => {
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
    const callback = (value: number | undefined): Promise<number[]> => {
      if (value === undefined || value === 0) {
        return Promise.resolve([0]);
      }
      return Promise.resolve([value, value * 2]);
    };
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1, 2, 0, 3, 6]);
  });
});

describe("flatMapAsync default value handling", () => {
  it("should use empty array as default when no defaultValue provided", async () => {
    const array = [1, 2];
    const callback = (value: number): Promise<number[]> => {
      if (value === 2) {
        throw new Error();
      }
      return Promise.resolve([value]);
    };
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([1]);
  });

  it("should use provided defaultValue for errors", async () => {
    const array = [1, 2, 3];
    const callback = (_: number): Promise<string[]> =>
      Promise.reject(new Error());
    const result = await flatMapAsync(array, callback, ["default"]);
    expect(result).toEqual(["default", "default", "default"]);
  });
});

describe("flatMapAsync with different types", () => {
  it("should handle string arrays", async () => {
    const array = ["hello", "world"];
    const callback = (str: string): Promise<string[]> =>
      Promise.resolve([str.toUpperCase()]);
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual(["HELLO", "WORLD"]);
  });

  it("should handle nested arrays", async () => {
    const array = [1, 2];
    const callback = (num: number): Promise<number[][]> =>
      Promise.resolve([[num], [num * 2]]);
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([[1], [2], [2], [4]]);
  });

  it("should handle object arrays", async () => {
    const array = [{ id: 1 }, { id: 2 }];
    const callback = (obj: { id: number }): Promise<{ value: number }[]> =>
      Promise.resolve([{ value: obj.id }]);
    const result = await flatMapAsync(array, callback);
    expect(result).toEqual([{ value: 1 }, { value: 2 }]);
  });
});

describe("flatMapAsync error handling", () => {
  it("should handle multiple errors in different positions", async () => {
    const array = [1, 2, 3, 4];
    const callback = (value: number): Promise<number[]> => {
      if (value % 2 === 0) {
        throw new Error();
      }
      return Promise.resolve([value]);
    };
    const result = await flatMapAsync(array, callback, [-1]);
    expect(result).toEqual([1, -1, 3, -1]);
  });

  it("should handle error in the last element", async () => {
    const array = [1, 2, 3];
    const callback = (value: number): Promise<number[]> => {
      if (value === 3) {
        throw new Error();
      }
      return Promise.resolve([value]);
    };
    const result = await flatMapAsync(array, callback, [-1]);
    expect(result).toEqual([1, 2, -1]);
  });

  it("should handle different types of errors", async () => {
    const array = [1, 2, 3];
    const callback = (value: number): Promise<number[]> => {
      if (value === 1) {
        throw new TypeError();
      }
      if (value === 2) {
        throw new RangeError();
      }
      if (value === 3) {
        throw new Error();
      }
      return Promise.resolve([value]);
    };
    const result = await flatMapAsync(array, callback, [-1]);
    expect(result).toEqual([-1, -1, -1]);
  });
});
