import { FirefoxCookieQueryStrategy } from "../FirefoxCookieQueryStrategy";

describe("FirefoxCookieQueryStrategy - Basic", () => {
  let strategy: FirefoxCookieQueryStrategy;
  const originalHome = process.env.HOME;

  beforeEach(() => {
    strategy = new FirefoxCookieQueryStrategy();
    process.env.HOME = "/mock/home";
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  it('should return "Firefox" as the browser name', () => {
    expect(strategy.browserName).toBe("Firefox");
  });
});
