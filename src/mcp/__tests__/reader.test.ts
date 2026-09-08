import { join, resolve } from "node:path";

import { createStrategy } from "../../core/browsers/StrategyFactory";
import { readCookies } from "../cookies";
import { listProfiles } from "../profiles";

jest.mock("../../core/browsers/StrategyFactory");
jest.mock("../profiles");

const queryCookies = jest.fn().mockResolvedValue([]);
const profileDirectory = resolve("/firefox-esr/Profiles/default");

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(createStrategy)
    .mockReturnValue({ queryCookies } as unknown as ReturnType<
      typeof createStrategy
    >);
  jest.mocked(listProfiles).mockReturnValue({
    profiles: [
      {
        browser: "firefox",
        name: "Work",
        directory: "Profiles/default",
        profileDirectory,
      },
    ],
    note: "Fixture profiles.",
  });
});

it("reads only the registered Firefox directory instead of all matching display names", async () => {
  await readCookies(new URL("https://example.com"), {
    browser: "firefox",
    profile: "Work",
    profileDirectory,
    container: 3,
  });
  expect(createStrategy).toHaveBeenCalledWith({
    browser: "firefox",
    container: 3,
  });
  expect(queryCookies).toHaveBeenCalledTimes(1);
  expect(queryCookies).toHaveBeenCalledWith(
    "%",
    "example.com",
    join(profileDirectory, "cookies.sqlite"),
    true,
  );
});

it("rejects unknown directories before reading a store", async () => {
  await expect(
    readCookies(new URL("https://example.com"), {
      browser: "firefox",
      profileDirectory: "/unregistered/store",
    }),
  ).rejects.toMatchObject({ code: "PROFILE_NOT_FOUND" });
  expect(createStrategy).not.toHaveBeenCalled();
});

it("rejects directory selection for other browsers", async () => {
  await expect(
    readCookies(new URL("https://example.com"), {
      browser: "chrome",
      profileDirectory,
    }),
  ).rejects.toThrow("only by Firefox");
  expect(createStrategy).not.toHaveBeenCalled();
});
