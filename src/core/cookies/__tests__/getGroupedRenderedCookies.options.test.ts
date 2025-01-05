import { getGroupedRenderedCookies } from "../getGroupedRenderedCookies";
import { renderCookies } from "../renderCookies";

// Mock dependencies
jest.mock("../getCookie", () => ({
  getCookie: jest
    .fn()
    .mockResolvedValue([
      { name: "test", value: "value", domain: "example.com" },
    ]),
}));
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

describe("getGroupedRenderedCookies - Options Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (renderCookies as jest.Mock).mockReturnValue(["test=value"]);
  });

  it("should pass render options correctly", async () => {
    const options = {
      showFilePaths: true,
      separator: " | ",
    };

    const result = await getGroupedRenderedCookies(
      { name: "test", domain: "example.com" },
      options,
    );

    expect(result).toEqual(["test=value"]);
    expect(renderCookies).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        ...options,
        format: "grouped",
      }),
    );
  });

  it("should handle undefined options", async () => {
    const result = await getGroupedRenderedCookies({
      name: "test",
      domain: "example.com",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(["test=value"]);
    expect(renderCookies).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        format: "grouped",
      }),
    );
  });
});
