import { fetchWithCookies } from "./fetchWithCookies";
import { FetchFn } from "./fetchWithCookies";

describe("fetchWithCookies", () => {
  let mockFetch: FetchFn;
  let mockResponse: Response;

  beforeEach(() => {
    mockFetch = jest.fn();
    mockResponse = new Response("mock body", { status: 200 });
    (mockFetch as jest.Mock).mockResolvedValue(mockResponse);
  });

  // it("should call fetch with the correct arguments", async () => {
  //   const url = "https://example.com/";
  //   const options: RequestInit = {
  //     method: "GET",
  //     headers: { "User-Agent": userAgent },
  //     redirect: "manual"
  //     //
  //   };
  //   await fetchWithCookies(url, options, mockFetch);
  //   expect(mockFetch).toBeCalledWith(url, options);
  // });

  it("should return the response from fetch", async () => {
    const url = "https://example.com/";
    const options = { method: "GET" };
    const response = await fetchWithCookies(url, options, mockFetch);
    expect(response).toBe(mockResponse);
  });
});
