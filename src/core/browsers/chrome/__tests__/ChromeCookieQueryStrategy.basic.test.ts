import { getEncryptedChromeCookie } from "../../getEncryptedChromeCookie";
import { ChromeCookieQueryStrategy } from "../ChromeCookieQueryStrategy";

jest.mock("../../getEncryptedChromeCookie");

describe("ChromeCookieQueryStrategy - Basic", () => {
  let strategy: ChromeCookieQueryStrategy;
  const originalPlatform = process.platform;

  beforeEach(() => {
    jest.resetAllMocks();
    strategy = new ChromeCookieQueryStrategy();
    (getEncryptedChromeCookie as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  it('should return "Chrome" as the browser name', () => {
    expect(strategy.browserName).toBe("Chrome");
  });

  it("should return empty array for non-darwin platforms", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
    });

    const cookies = await strategy.queryCookies("test", "example.com");
    expect(cookies).toEqual([]);
  });
});
