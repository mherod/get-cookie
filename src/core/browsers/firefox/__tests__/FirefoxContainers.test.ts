import * as fileSystemAdapter from "../../runtime/FileSystemAdapter";
import {
  extractUserContextId,
  parseFirefoxContainersJson,
  resolveFirefoxContainer,
} from "../FirefoxContainers";

jest.mock("../../runtime/FileSystemAdapter");

describe("FirefoxContainers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractUserContextId", () => {
    it("extracts userContextId from standard originAttributes string", () => {
      expect(extractUserContextId("^userContextId=2")).toBe(2);
    });

    it("extracts userContextId when combined with other originAttributes", () => {
      expect(extractUserContextId("^userContextId=2&geckoView.appId=1")).toBe(
        2,
      );
    });

    it("returns undefined when userContextId is absent", () => {
      expect(
        extractUserContextId("^firstPartyDomain=example.com"),
      ).toBeUndefined();
      expect(extractUserContextId("")).toBeUndefined();
      expect(extractUserContextId(null)).toBeUndefined();
      expect(extractUserContextId(undefined)).toBeUndefined();
    });
  });

  describe("parseFirefoxContainersJson", () => {
    it("parses valid containers.json file into a map of lowercased names to userContextIds", () => {
      const mockContent = JSON.stringify({
        version: 1,
        containers: [
          { userContextId: 1, name: "Personal" },
          { userContextId: 2, name: "Work" },
          { userContextId: 3, name: "Banking" },
        ],
      });

      (fileSystemAdapter.fileExists as jest.Mock).mockReturnValue(true);
      (fileSystemAdapter.readTextFile as jest.Mock).mockReturnValue(
        mockContent,
      );

      const map = parseFirefoxContainersJson("/mock/path/containers.json");
      expect(map.get("personal")).toBe(1);
      expect(map.get("work")).toBe(2);
      expect(map.get("banking")).toBe(3);
    });

    it("returns empty map if containers.json file does not exist", () => {
      (fileSystemAdapter.fileExists as jest.Mock).mockReturnValue(false);

      const map = parseFirefoxContainersJson("/mock/path/containers.json");
      expect(map.size).toBe(0);
    });

    it("returns empty map on malformed JSON", () => {
      (fileSystemAdapter.fileExists as jest.Mock).mockReturnValue(true);
      (fileSystemAdapter.readTextFile as jest.Mock).mockReturnValue(
        "INVALID_JSON",
      );

      const map = parseFirefoxContainersJson("/mock/path/containers.json");
      expect(map.size).toBe(0);
    });
  });

  describe("resolveFirefoxContainer", () => {
    it("returns number when passed numeric value or numeric string", () => {
      expect(resolveFirefoxContainer(2)).toBe(2);
      expect(resolveFirefoxContainer("2")).toBe(2);
    });

    it("returns 'none' for case-insensitive 'none'", () => {
      expect(resolveFirefoxContainer("none")).toBe("none");
      expect(resolveFirefoxContainer("NONE")).toBe("none");
    });

    it("resolves container name using containers.json beside cookies.sqlite", () => {
      const mockContent = JSON.stringify({
        containers: [{ userContextId: 2, name: "Work" }],
      });

      (fileSystemAdapter.fileExists as jest.Mock).mockReturnValue(true);
      (fileSystemAdapter.readTextFile as jest.Mock).mockReturnValue(
        mockContent,
      );

      const result = resolveFirefoxContainer(
        "Work",
        "/mock/profile/cookies.sqlite",
      );
      expect(result).toBe(2);
    });

    it("throws error for unknown container name", () => {
      (fileSystemAdapter.fileExists as jest.Mock).mockReturnValue(false);

      expect(() =>
        resolveFirefoxContainer(
          "UnknownContainer",
          "/mock/profile/cookies.sqlite",
        ),
      ).toThrow("Unknown Firefox container: 'UnknownContainer'");
    });
  });
});
