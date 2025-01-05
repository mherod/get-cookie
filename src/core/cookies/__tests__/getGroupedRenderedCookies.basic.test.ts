import type { ExportedCookie } from "../../../types/schemas";
import { getCookie } from "../getCookie";
import { getGroupedRenderedCookies } from "../getGroupedRenderedCookies";
import { renderCookies } from "../renderCookies";

// Mock dependencies
jest.mock("../getCookie");
jest.mock("../renderCookies");
jest.mock("@utils/logger", () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    withTag: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe("getGroupedRenderedCookies - Basic Functionality", () => {
  const mockCookies: ExportedCookie[] = [
    {
      name: "session",
      value: "abc123",
      domain: "example.com",
      expiry: Date.now() + 3600000,
      meta: { file: "chrome/cookies.db" },
    },
    {
      name: "theme",
      value: "dark",
      domain: "example.com",
      expiry: Date.now() + 3600000,
      meta: { file: "firefox/cookies.sqlite" },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getCookie as jest.Mock).mockResolvedValue(mockCookies);
    (renderCookies as jest.Mock).mockReturnValue([
      "chrome/cookies.db: session=abc123",
      "firefox/cookies.sqlite: theme=dark",
    ]);
  });

  it("should return grouped cookies when valid cookies are provided", async () => {
    const result = await getGroupedRenderedCookies(
      { name: "test", domain: "example.com" },
      { showFilePaths: true },
    );

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([
      "chrome/cookies.db: session=abc123",
      "firefox/cookies.sqlite: theme=dark",
    ]);
    expect(getCookie).toHaveBeenCalledWith({
      name: "test",
      domain: "example.com",
    });
  });

  it("should handle empty cookie results", async () => {
    (getCookie as jest.Mock).mockResolvedValue([]);
    (renderCookies as jest.Mock).mockReturnValue([]);

    const result = await getGroupedRenderedCookies({
      name: "nonexistent",
      domain: "example.com",
    });

    expect(result).toEqual([]);
  });

  it("should handle non-array cookie results", async () => {
    (getCookie as jest.Mock).mockResolvedValue(null);

    const result = await getGroupedRenderedCookies({
      name: "test",
      domain: "example.com",
    });

    expect(result).toEqual([]);
  });
});
