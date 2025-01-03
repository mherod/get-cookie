/**
 * Asynchronously maps over an array and flattens the result.
 * Similar to Array.prototype.flatMap but for async operations.
 * @param array The input array to map over
 * @param callback The async mapping function to apply to each element
 * @param defaultValue The default value to return if the array is empty
 * @returns A flattened array of results
 */
export async function flatMapAsync<T, U>(
  array: T[],
  callback: (item: T) => Promise<U[]>,
  defaultValue: U[] = []
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
    })
  );
  return results.flat();
}
