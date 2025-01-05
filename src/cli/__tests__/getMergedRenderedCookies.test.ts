import { getMergedRenderedCookies } from "../../core/cookies/getMergedRenderedCookies";
import type { CookieSpec, ExportedCookie } from "../../types/schemas";

const mockGetCookie = jest.fn<Promise<ExportedCookie[]>, [CookieSpec]>();

jest.mock("../../core/cookies/getCookie", () => ({
  __esModule: true,
  getCookie: (spec: CookieSpec) => mockGetCookie(spec),
}));

describe("getMergedRenderedCookies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return empty string if no cookies are present", async () => {
    mockGetCookie.mockResolvedValueOnce([]);
    const cookieSpec: CookieSpec = {
      name: "nonexistentCookie",
      domain: "example.com",
    };
    const result = await getMergedRenderedCookies(cookieSpec);
    expect(result).toBe("");
  });

  it("should return rendered cookies if cookies are present", async () => {
    const mockCookie: ExportedCookie = {
      name: "sessionCookie",
      value: "sessionCookieValue",
      domain: "example.com",
      expiry: new Date(0),
      meta: {
        browser: "Mock",
        file: "mock-store",
        creation: new Date(),
      },
    };
    mockGetCookie.mockResolvedValueOnce([mockCookie]);
    const cookieSpec: CookieSpec = {
      name: "sessionCookie",
      domain: "example.com",
    };
    const result = await getMergedRenderedCookies(cookieSpec);
    expect(result).not.toBe("");
    expect(result).toBe("sessionCookie=sessionCookieValue");
  });
});
