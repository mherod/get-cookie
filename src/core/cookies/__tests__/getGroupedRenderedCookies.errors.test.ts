import { ExportedCookieSchema } from "../../../types/schemas";
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

describe("getGroupedRenderedCookies - Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (renderCookies as jest.Mock).mockReturnValue([]);
  });

  it("should handle getCookie errors gracefully", async () => {
    (getCookie as jest.Mock).mockRejectedValue(
      new Error("Failed to get cookies"),
    );

    const result = await getGroupedRenderedCookies({
      name: "test",
      domain: "example.com",
    });

    expect(result).toEqual([]);
  });

  it("should filter out invalid cookies", async () => {
    const invalidCookie = {
      name: 123, // Invalid type for name
      value: "test",
      domain: "example.com",
    };
    (getCookie as jest.Mock).mockResolvedValue([invalidCookie]);
    (renderCookies as jest.Mock).mockReturnValue([]);

    const result = await getGroupedRenderedCookies({
      name: "test",
      domain: "example.com",
    });

    expect(result).toEqual([]);
  });

  it("should validate cookies against schema", async () => {
    const validCookie = {
      name: "test",
      value: "value",
      domain: "example.com",
      expiry: Date.now() + 3600000,
    };
    const spy = jest.spyOn(ExportedCookieSchema, "safeParse");
    (getCookie as jest.Mock).mockResolvedValue([validCookie]);
    (renderCookies as jest.Mock).mockReturnValue(["test=value"]);

    const result = await getGroupedRenderedCookies({
      name: "test",
      domain: "example.com",
    });

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(["test=value"]);
    spy.mockRestore();
  });
});
