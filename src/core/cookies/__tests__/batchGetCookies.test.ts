import type { CookieSpec, ExportedCookie } from "../../../types/schemas";
import {
  batchGetCookies,
  batchGetCookiesWithResults,
} from "../batchGetCookies";
import { batchQueryCookies } from "../batchQueryCookies";
import { getCookie } from "../getCookie";

// Mock getCookie and batchQueryCookies
jest.mock("../getCookie");
jest.mock("../batchQueryCookies");

// Helper to create mock cookies with minimal required fields
const mockCookie = (partial: Partial<ExportedCookie>): ExportedCookie[] => {
  return [{ name: "", domain: "", value: "", ...partial } as ExportedCookie];
};

describe("batchGetCookies", () => {
  const mockGetCookie = getCookie as jest.MockedFunction<typeof getCookie>;
  const mockBatchQueryCookies = batchQueryCookies as jest.MockedFunction<
    typeof batchQueryCookies
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should fetch multiple cookie specs in parallel", async () => {
      const specs: CookieSpec[] = [
        { name: "auth", domain: "example.com" },
        { name: "session", domain: "api.example.com" },
        { name: "token", domain: "app.example.com" },
      ];

      mockBatchQueryCookies.mockResolvedValueOnce([
        {
          name: "auth",
          domain: "example.com",
          value: "auth123",
        } as ExportedCookie,
        {
          name: "session",
          domain: "api.example.com",
          value: "session456",
        } as ExportedCookie,
        {
          name: "token",
          domain: "app.example.com",
          value: "token789",
        } as ExportedCookie,
      ]);

      const result = await batchGetCookies(specs);

      expect(mockBatchQueryCookies).toHaveBeenCalledTimes(1);
      expect(mockBatchQueryCookies).toHaveBeenCalledWith(specs, true);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ name: "auth", value: "auth123" });
    });

    it("should handle empty specs array", async () => {
      const result = await batchGetCookies([]);
      expect(result).toEqual([]);
      expect(mockGetCookie).not.toHaveBeenCalled();
    });

    it("should handle single spec", async () => {
      const spec: CookieSpec = { name: "test", domain: "example.com" };

      mockBatchQueryCookies.mockResolvedValueOnce([
        {
          name: "test",
          domain: "example.com",
          value: "test123",
        } as ExportedCookie,
      ]);

      const result = await batchGetCookies([spec]);

      expect(mockBatchQueryCookies).toHaveBeenCalledTimes(1);
      expect(mockBatchQueryCookies).toHaveBeenCalledWith([spec], true);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: "test", value: "test123" });
    });
  });

  describe("deduplication", () => {
    it("should deduplicate cookies by default", async () => {
      const specs: CookieSpec[] = [
        { name: "auth", domain: "example.com" },
        { name: "auth", domain: "example.com" }, // Duplicate spec
      ];

      mockBatchQueryCookies.mockResolvedValueOnce([
        {
          name: "auth",
          domain: "example.com",
          value: "short",
        } as ExportedCookie,
        {
          name: "auth",
          domain: "example.com",
          value: "longervalue",
        } as ExportedCookie,
      ]);

      const result = await batchGetCookies(specs);

      expect(result).toHaveLength(1);
      expect(result[0]?.value).toBe("longervalue"); // Keeps the longer value
    });

    it("should not deduplicate when option is false", async () => {
      const specs: CookieSpec[] = [
        { name: "auth", domain: "example.com" },
        { name: "auth", domain: "example.com" },
      ];

      mockBatchQueryCookies.mockResolvedValueOnce([
        {
          name: "auth",
          domain: "example.com",
          value: "value1",
        } as ExportedCookie,
        {
          name: "auth",
          domain: "example.com",
          value: "value2",
        } as ExportedCookie,
      ]);

      const result = await batchGetCookies(specs, { deduplicate: false });

      expect(result).toHaveLength(2);
    });

    it("should keep cookies with different names or domains", async () => {
      const specs: CookieSpec[] = [
        { name: "auth", domain: "example.com" },
        { name: "session", domain: "example.com" },
        { name: "auth", domain: "api.example.com" },
      ];

      mockBatchQueryCookies.mockResolvedValueOnce([
        {
          name: "auth",
          domain: "example.com",
          value: "auth1",
        } as ExportedCookie,
        {
          name: "session",
          domain: "example.com",
          value: "session1",
        } as ExportedCookie,
        {
          name: "auth",
          domain: "api.example.com",
          value: "auth2",
        } as ExportedCookie,
      ]);

      const result = await batchGetCookies(specs);

      expect(result).toHaveLength(3);
    });
  });

  describe("concurrency control (fallback mode)", () => {
    it("should respect concurrency limit when falling back", async () => {
      const specs: CookieSpec[] = Array.from({ length: 10 }, (_, i) => ({
        name: `cookie${i}`,
        domain: "example.com",
      }));

      // Make batch query fail to trigger fallback
      mockBatchQueryCookies.mockRejectedValueOnce(
        new Error("Batch query failed"),
      );

      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      mockGetCookie.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);

        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 10));

        concurrentCalls--;
        return [];
      });

      await batchGetCookies(specs, { concurrency: 3 });

      expect(maxConcurrentCalls).toBeLessThanOrEqual(3);
      expect(mockGetCookie).toHaveBeenCalledTimes(10);
    });

    it("should process all specs even with concurrency limit when falling back", async () => {
      const specs: CookieSpec[] = Array.from({ length: 7 }, (_, i) => ({
        name: `cookie${i}`,
        domain: "example.com",
      }));

      // Make batch query fail to trigger fallback
      mockBatchQueryCookies.mockRejectedValueOnce(
        new Error("Batch query failed"),
      );
      mockGetCookie.mockResolvedValue([]);

      await batchGetCookies(specs, { concurrency: 3 });

      expect(mockGetCookie).toHaveBeenCalledTimes(7);
      specs.forEach((spec) => {
        expect(mockGetCookie).toHaveBeenCalledWith(spec);
      });
    });
  });

  describe("error handling", () => {
    it("should continue on error by default when falling back", async () => {
      const specs: CookieSpec[] = [
        { name: "cookie1", domain: "example.com" },
        { name: "cookie2", domain: "example.com" },
        { name: "cookie3", domain: "example.com" },
      ];

      // Make batch query fail to trigger fallback
      mockBatchQueryCookies.mockRejectedValueOnce(
        new Error("Batch query failed"),
      );

      mockGetCookie
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce(
          mockCookie({
            name: "cookie3",
            domain: "example.com",
            value: "value3",
          }),
        );

      const result = await batchGetCookies(specs);

      expect(mockGetCookie).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: "cookie3", value: "value3" });
    });

    it("should throw on error when continueOnError is false", async () => {
      const specs: CookieSpec[] = [
        { name: "cookie1", domain: "example.com" },
        { name: "cookie2", domain: "example.com" },
      ];

      const error = new Error("Test error");
      mockBatchQueryCookies.mockRejectedValueOnce(error);

      // When batch query fails with continueOnError: false, it should throw
      await expect(
        batchGetCookies(specs, { continueOnError: false }),
      ).rejects.toThrow("Test error");
    });

    it("should handle non-Error objects in catch", async () => {
      const specs: CookieSpec[] = [{ name: "cookie1", domain: "example.com" }];

      // Make batch query fail to trigger fallback
      mockBatchQueryCookies.mockRejectedValueOnce(
        new Error("Batch query failed"),
      );
      mockGetCookie.mockRejectedValueOnce("String error");

      const result = await batchGetCookies(specs);

      expect(result).toEqual([]);
    });
  });
});

describe("batchGetCookiesWithResults", () => {
  const mockGetCookie = getCookie as jest.MockedFunction<typeof getCookie>;
  const mockBatchQueryCookies = batchQueryCookies as jest.MockedFunction<
    typeof batchQueryCookies
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return detailed results for each spec", async () => {
    const specs: CookieSpec[] = [
      { name: "cookie1", domain: "example.com" },
      { name: "cookie2", domain: "example.com" },
    ];

    mockBatchQueryCookies.mockResolvedValueOnce([
      {
        name: "cookie1",
        domain: "example.com",
        value: "value1",
      } as ExportedCookie,
      {
        name: "cookie2",
        domain: "example.com",
        value: "value2",
      } as ExportedCookie,
    ]);

    const results = await batchGetCookiesWithResults(specs);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      spec: specs[0],
      cookies: expect.arrayContaining([
        expect.objectContaining({ name: "cookie1", value: "value1" }),
      ]),
    });
    expect(results[1]).toMatchObject({
      spec: specs[1],
      cookies: expect.arrayContaining([
        expect.objectContaining({ name: "cookie2", value: "value2" }),
      ]),
    });
  });

  it("should include errors in results when continueOnError is true", async () => {
    const specs: CookieSpec[] = [
      { name: "cookie1", domain: "example.com" },
      { name: "cookie2", domain: "example.com" },
    ];

    // Make batch query fail to trigger fallback
    mockBatchQueryCookies.mockRejectedValueOnce(
      new Error("Batch query failed"),
    );

    const error = new Error("Test error");

    mockGetCookie
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(
        mockCookie({ name: "cookie2", domain: "example.com", value: "value2" }),
      );

    const results = await batchGetCookiesWithResults(specs);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      spec: specs[0],
      cookies: [],
      error: expect.objectContaining({ message: "Test error" }),
    });
    expect(results[1]).toMatchObject({
      spec: specs[1],
      cookies: expect.arrayContaining([
        expect.objectContaining({ name: "cookie2" }),
      ]),
    });
  });

  it("should throw on error when continueOnError is false", async () => {
    const specs: CookieSpec[] = [{ name: "cookie1", domain: "example.com" }];

    // Make batch query fail to trigger fallback
    mockBatchQueryCookies.mockRejectedValueOnce(
      new Error("Batch query failed"),
    );

    const error = new Error("Test error");
    mockGetCookie.mockRejectedValueOnce(error);

    await expect(
      batchGetCookiesWithResults(specs, { continueOnError: false }),
    ).rejects.toThrow("Test error");
  });

  it("should handle empty specs array", async () => {
    const results = await batchGetCookiesWithResults([]);
    expect(results).toEqual([]);
    expect(mockGetCookie).not.toHaveBeenCalled();
  });

  it("should respect concurrency limit", async () => {
    const specs: CookieSpec[] = Array.from({ length: 5 }, (_, i) => ({
      name: `cookie${i}`,
      domain: "example.com",
    }));

    // Make batch query fail to trigger fallback
    mockBatchQueryCookies.mockRejectedValueOnce(
      new Error("Batch query failed"),
    );

    let concurrentCalls = 0;
    let maxConcurrentCalls = 0;

    mockGetCookie.mockImplementation(async () => {
      concurrentCalls++;
      maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);

      await new Promise((resolve) => setTimeout(resolve, 10));

      concurrentCalls--;
      return [];
    });

    await batchGetCookiesWithResults(specs, { concurrency: 2 });

    expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
    expect(mockGetCookie).toHaveBeenCalledTimes(5);
  });
});
