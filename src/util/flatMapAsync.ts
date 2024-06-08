// This utility function applies an async callback to each element of the input array (just like Array.prototype.map),
// waits for all resulting promises to fulfill (similar to Promise.all), and then flattens the resulting array (like Array.prototype.flat).

export async function flatMapAsync<T, O>(
  array: T[], // The input array to transform.
  callback: (value: T, index: number, array: T[]) => Promise<O[]>, // The async function to apply to each input array element.
  or?: O[] | ((error: any) => O[] | Promise<O[]>), // An optional callback to handle errors.
): Promise<O[]> {
  if (or) {
    const errorHandlingCallback = async (
      value: T,
      index: number,
      array: T[],
    ): Promise<O[]> => {
      try {
        return await callback(value, index, array);
      } catch (error) {
        return typeof or === "function" ? await or(error) : or;
      }
    };
    return flatMapAsync(array, errorHandlingCallback);
  }

  // Step 1: Use a for loop to transform each element of the input array with the provided callback.
  // This will result in an array of promises.
  const promises: Promise<O[]>[] = [];
  for (let i = 0; i < array.length; i++) {
    promises.push(callback(array[i], i, array));
  }

  // Step 2: Use Promise.all to wait for all promises in the array to fulfill.
  // This will give us an array of fulfilled promise values.
  const awaitedAll: O[][] = await Promise.all(promises);

  // Step 3: Flatten the array of fulfilled promise values into a single array.
  // Note: The '@ts-ignore' comment is used to suppress TypeScript compiler warnings, as .flat() method might not be recognized
  // as a valid method for an array of Awaited<O> instances. However, this code assumes that the result of Promise.all
  // is indeed an array that can be flattened.
  // @ts-ignore
  return awaitedAll.flat();
}
