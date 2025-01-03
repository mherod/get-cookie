/**
 * Asynchronously maps over an array and flattens the result.
 * Similar to Array.prototype.flatMap but for async operations.
 *
 * @param array The input array to map over
 * @param callback The async mapping function to apply to each element
 * @param defaultValue The default value to return if the array is empty
 * @returns A flattened array of results
 *
 * @example
 * // Basic usage with number arrays
 * const numbers = [1, 2, 3];
 * const result = await flatMapAsync(
 *   numbers,
 *   async (num) => [num, num * 2]
 * );
 * console.log(result); // [1, 2, 2, 4, 3, 6]
 *
 * @example
 * // Error handling with default value
 * const data = ['valid', 'invalid'];
 * const result = await flatMapAsync(
 *   data,
 *   async (item) => {
 *     if (item === 'invalid') throw new Error();
 *     return [item.toUpperCase()];
 *   },
 *   ['DEFAULT']
 * );
 * console.log(result); // ['VALID', 'DEFAULT']
 */
export async function flatMapAsync<T, U>(
  array: T[],
  callback: (item: T) => Promise<U[]>,
  defaultValue: U[] = [],
): Promise<U[]> {
  if (array.length === 0) {
    return defaultValue;
  }

  const results = await Promise.all(
    array.map(async (item) => {
      try {
        return await callback(item);
      } catch (_error) {
        return defaultValue;
      }
    }),
  );
  return results.flat();
}
