import type { ExportedCookie } from "../../../types/schemas";
import logger from "../../../utils/logger";
import { getBrowserDisplayName } from "../../browsers/BrowserDetector";
import { createBrowserStrategy } from "../../browsers/StrategyFactory";
import { getBrowserCookie } from "../getBrowserCookie";

jest.mock("../../browsers/StrategyFactory", () => ({
  createBrowserStrategy: jest.fn(),
}));

jest.mock("../../browsers/BrowserDetector", () => ({
  getBrowserDisplayName: jest.fn(),
}));

jest.mock("../../../utils/logger", () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
  },
}));

describe("getBrowserCookie", () => {
  const cookieSpec = { name: "session", domain: "example.com" };

  beforeEach(() => {
    jest.clearAllMocks();
    (getBrowserDisplayName as jest.Mock).mockImplementation(
      (browser: string) => browser,
    );
  });

  it("uses the browser strategy factory to query cookies", async () => {
    const mockCookies: ExportedCookie[] = [
      {
        name: "session",
        value: "abc123",
        domain: "example.com",
      },
    ];
    const queryCookies = jest.fn().mockResolvedValue(mockCookies);

    (createBrowserStrategy as jest.Mock).mockReturnValue({ queryCookies });

    const result = await getBrowserCookie("chrome", cookieSpec);

    expect(result).toEqual(mockCookies);
    expect(createBrowserStrategy).toHaveBeenCalledWith("chrome");
    expect(queryCookies).toHaveBeenCalledWith("session", "example.com");
  });

  it("logs a warning and returns an empty array when querying fails", async () => {
    const queryCookies = jest.fn().mockRejectedValue(new Error("boom"));

    (createBrowserStrategy as jest.Mock).mockReturnValue({ queryCookies });
    (getBrowserDisplayName as jest.Mock).mockReturnValue("Google Chrome");

    const result = await getBrowserCookie("chrome", cookieSpec);

    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      "Error querying Google Chrome cookies:",
      "boom",
    );
  });
});
