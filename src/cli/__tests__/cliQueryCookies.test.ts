import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";
import { createStrategy } from "@core/browsers/StrategyFactory";
import { logger } from "@utils/logHelpers";

import { cliQueryCookies } from "../cliQueryCookies";
import { formatAndPrintCookies } from "../CookieFormatter";

jest.mock("@core/browsers/StrategyFactory", () => ({
  createStrategy: jest.fn(),
}));
jest.mock("../CookieFormatter", () => ({
  formatAndPrintCookies: jest.fn(),
}));

describe("cliQueryCookies", () => {
  const spec = { name: "session", domain: "example.com" };
  const cookie = { ...spec, value: "short", expiry: 4102444800 };
  const strategy = new CompositeCookieQueryStrategy([]);
  const query = jest.spyOn(strategy, "queryCookies");

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockReset().mockResolvedValue([cookie]);
    jest.mocked(createStrategy).mockReturnValue(strategy);
  });

  it("forwards browser, profile, container, store and force", async () => {
    const args = {
      browser: "firefox",
      profile: "Work",
      container: 2,
      force: true,
    };
    await cliQueryCookies(args, spec, undefined, false, "/tmp/cookies.sqlite");
    expect(createStrategy).toHaveBeenCalledWith({
      browser: "firefox",
      profile: "Work",
      container: 2,
      storePath: "/tmp/cookies.sqlite",
    });
    expect(query).toHaveBeenCalledWith(
      "session",
      "example.com",
      "/tmp/cookies.sqlite",
      true,
    );
    expect(formatAndPrintCookies).toHaveBeenCalledWith([cookie], args);
  });

  it("omits absent and invalid optional selectors", async () => {
    await cliQueryCookies(
      { browser: true, profile: 2, container: false },
      spec,
    );
    expect(createStrategy).toHaveBeenCalledWith({});
    expect(query).toHaveBeenCalledWith(
      "session",
      "example.com",
      undefined,
      undefined,
    );
  });

  const containers = [0, 2, "none", "Work"];
  const forContainer = it.each(containers);
  forContainer("forwards container %s without a browser", async (container) => {
    await cliQueryCookies({ container }, spec);
    expect(createStrategy).toHaveBeenCalledWith({ container });
  });

  it("stops querying specs once the result limit is reached", async () => {
    query.mockResolvedValue([cookie, { ...cookie, name: "second" }]);
    await cliQueryCookies({}, [spec, { ...spec, name: "unused" }], 1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(formatAndPrintCookies).toHaveBeenCalledWith([cookie], {});
  });

  it("combines specs and keeps the longest duplicate value", async () => {
    const longer = { ...cookie, value: "longer value" };
    query.mockResolvedValueOnce([cookie]).mockResolvedValueOnce([longer]);
    await cliQueryCookies({}, [spec, { ...spec, name: "%" }]);
    expect(query).toHaveBeenCalledTimes(2);
    expect(formatAndPrintCookies).toHaveBeenCalledWith([longer], {});
  });

  it("preserves duplicates when requested", async () => {
    query.mockResolvedValue([cookie, cookie]);
    await cliQueryCookies({}, spec, undefined, false, undefined, false);
    expect(formatAndPrintCookies).toHaveBeenCalledWith([cookie, cookie], {});
  });

  it("filters non-JWT cookies in JWT-only mode", async () => {
    await cliQueryCookies({ "jwt-only": true }, spec);
    expect(formatAndPrintCookies).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "No cookies containing valid JWT tokens were found",
    );
  });

  it("reports empty profile results without printing cookies", async () => {
    query.mockResolvedValue([]);
    await cliQueryCookies({ browser: "firefox", profile: "Work" }, spec);
    expect(formatAndPrintCookies).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "Could not find cookies for profile: Work",
    );
  });

  it("reports query failures without printing cookies", async () => {
    query.mockRejectedValue(new Error("query failed"));
    await cliQueryCookies({}, spec);
    expect(formatAndPrintCookies).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("query failed");
  });
});
