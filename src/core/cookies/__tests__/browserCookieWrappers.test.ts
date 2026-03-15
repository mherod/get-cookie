import type { ExportedCookie } from "../../../types/schemas";

import { getChromeCookie } from "../getChromeCookie";
import { getBrowserCookie } from "../getBrowserCookie";
import { getFirefoxCookie } from "../getFirefoxCookie";

jest.mock("../getBrowserCookie", () => ({
  getBrowserCookie: jest.fn(),
}));

describe("browser cookie wrappers", () => {
  const cookieSpec = { name: "session", domain: "example.com" };
  const mockCookies: ExportedCookie[] = [
    {
      name: "session",
      value: "abc123",
      domain: "example.com",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getBrowserCookie as jest.Mock).mockResolvedValue(mockCookies);
  });

  it("delegates Chrome cookie lookup to the shared browser helper", async () => {
    const result = await getChromeCookie(cookieSpec);

    expect(result).toEqual(mockCookies);
    expect(getBrowserCookie).toHaveBeenCalledWith("chrome", cookieSpec);
  });

  it("delegates Firefox cookie lookup to the shared browser helper", async () => {
    const result = await getFirefoxCookie(cookieSpec);

    expect(result).toEqual(mockCookies);
    expect(getBrowserCookie).toHaveBeenCalledWith("firefox", cookieSpec);
  });
});
