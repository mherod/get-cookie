import { setFileSystemAdapter } from "../../runtime/FileSystemAdapter";
import { getChromiumProfiles } from "../getChromiumProfiles";

describe("getChromiumProfiles", () => {
  beforeEach(() => {
    setFileSystemAdapter(undefined);
  });

  afterEach(() => {
    setFileSystemAdapter(undefined);
  });

  it("returns empty array for an invalid browser name", () => {
    const profiles = getChromiumProfiles("nonexistent-browser-name-xyz");
    expect(profiles).toEqual([]);
  });

  it("parses Local State JSON with profiles correctly using mock file system", () => {
    const mockLocalState = JSON.stringify({
      profile: {
        info_cache: {
          Default: {
            name: "Personal",
            user_name: "personal@example.com",
          },
          "Profile 1": {
            name: "Work",
            user_name: "work@example.com",
          },
        },
      },
    });

    const mockAdapter = {
      fileExists: jest.fn((path: string) => path.includes("Local State")),
      readTextFile: jest.fn((path: string) => {
        if (path.includes("Local State")) {
          return mockLocalState;
        }
        throw new Error("File not found");
      }),
      getFileModificationTime: jest.fn(),
      readLeadingBytes: jest.fn(),
      readFile: jest.fn(),
    };

    setFileSystemAdapter(mockAdapter);

    const profiles = getChromiumProfiles("chrome");

    expect(profiles.length).toBeGreaterThan(0);
    const defaultProfile = profiles.find((p) => p.directory === "Default");
    expect(defaultProfile).toBeDefined();
    expect(defaultProfile?.name).toBe("Personal");
    expect(defaultProfile?.userName).toBe("personal@example.com");
    expect(defaultProfile?.browser).toBe("chrome");

    const workProfile = profiles.find((p) => p.directory === "Profile 1");
    expect(workProfile).toBeDefined();
    expect(workProfile?.name).toBe("Work");
    expect(workProfile?.userName).toBe("work@example.com");
  });

  it("handles malformed Local State JSON gracefully", () => {
    const mockAdapter = {
      fileExists: jest.fn(() => true),
      readTextFile: jest.fn(() => "invalid json content {{{"),
      getFileModificationTime: jest.fn(),
      readLeadingBytes: jest.fn(),
      readFile: jest.fn(),
    };

    setFileSystemAdapter(mockAdapter);

    const profiles = getChromiumProfiles("chrome");
    expect(profiles).toEqual([]);
  });
});
