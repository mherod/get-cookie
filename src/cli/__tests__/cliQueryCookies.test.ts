import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";
import { createStrategy } from "@core/browsers/StrategyFactory";
import { logger } from "@utils/logHelpers";
import { parseArgv } from "@utils/argv";
import {
  getLinuxKeyringOverride,
  usesRawCookieValues,
} from "@core/cookies/CookieQueryContext";

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

  it("deduplicates overlapping Netscape specs by source and cookie path", async () => {
    const root = {
      ...cookie,
      meta: { file: "/browser/Default/Cookies", path: "/" },
    };
    const nested = { ...root, meta: { ...root.meta, path: "/app" } };
    const otherProfile = {
      ...root,
      meta: { ...root.meta, file: "/browser/Work/Cookies" },
    };
    query.mockResolvedValue([root, nested, otherProfile]);
    const args = { output: "netscape" };
    await cliQueryCookies(args, [spec, { ...spec, domain: "www.example.com" }]);
    expect(query).toHaveBeenCalledTimes(2);
    expect(formatAndPrintCookies).toHaveBeenCalledWith(
      [root, nested, otherProfile],
      args,
    );
  });

  it("queries lossless Netscape values and preserves cookies on different paths", async () => {
    const rows = [
      { ...cookie, value: "raw%2Fvalue", meta: { path: "/" } },
      { ...cookie, value: "nested", meta: { path: "/app" } },
    ];
    query.mockImplementation(async () => {
      expect(usesRawCookieValues()).toBe(true);
      expect(getLinuxKeyringOverride()).toBe("basic");
      return rows;
    });
    const args = { output: "netscape", keyring: "basic" };
    await cliQueryCookies(args, spec);
    expect(formatAndPrintCookies).toHaveBeenCalledWith(rows, args);
    expect(usesRawCookieValues()).toBe(false);
  });

  it("prints an empty Netscape jar when no cookies match", async () => {
    query.mockResolvedValue([]);
    await cliQueryCookies({ output: "netscape" }, spec);
    expect(formatAndPrintCookies).toHaveBeenCalledWith([], {
      output: "netscape",
    });
  });

  it("forwards a parsed keyring override in the query context", async () => {
    query.mockImplementation(async () => {
      expect(getLinuxKeyringOverride()).toBe("basic");
      return [cookie];
    });
    await cliQueryCookies(parseArgv(["--keyring", "basic"]).values, spec);
    expect(query).toHaveBeenCalledTimes(1);
    expect(getLinuxKeyringOverride()).toBeUndefined();
  });

  it("rejects invalid keyring selectors before querying", async () => {
    await cliQueryCookies({ keyring: "invalid" }, spec);
    expect(query).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "--keyring must be basic, gnome or kwallet",
    );
  });

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
