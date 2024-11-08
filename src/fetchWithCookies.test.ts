import { fetchWithCookies } from "./fetchWithCookies";
import { vi, expect, describe, it, beforeEach, afterEach } from "vitest";

const mockUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

describe("fetchWithCookies", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call fetch with the correct arguments", async () => {
    const url = "https://example.com/";
    const options: RequestInit = {
      method: "GET",
      headers: { "User-Agent": mockUserAgent },
    };

    await fetchWithCookies(url, options);

    expect(fetch).toHaveBeenCalledWith(url, {
      ...options,
      headers: {
        ...options.headers,
        "User-Agent": mockUserAgent,
        Cookie: expect.any(String),
      },
    });
  });

  it("should return the response from fetch", async () => {
    const mockResponse = new Response("Test response");
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const url = "https://example.com/";
    const response = await fetchWithCookies(url);

    expect(response).toBe(mockResponse);
  });
});
