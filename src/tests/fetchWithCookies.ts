/**
 * Type for a fetch-like function
 */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Wrapper around fetch that handles cookies
 * @param url - The URL to fetch
 * @param init - Request initialization options
 * @param fetchFn - Optional fetch implementation to use
 * @returns A promise that resolves to the fetch response
 */
export async function fetchWithCookies(
  url: string,
  init?: RequestInit,
  fetchFn: FetchFn = fetch
): Promise<Response> {
  const options: RequestInit = {
    ...init,
    credentials: "include",
  };

  return fetchFn(url, options);
}
