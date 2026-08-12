import { access } from "node:fs/promises";

import { checkFilePermission } from "../systemPermissions";

jest.mock("node:fs/promises", () => {
  const actual = jest.requireActual("node:fs/promises");
  return {
    ...actual,
    access: jest.fn(),
  };
});

const mockAccess = access as jest.MockedFunction<typeof access>;

describe("systemPermissions - checkFilePermission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when file is readable", async () => {
    mockAccess.mockResolvedValueOnce(undefined);

    const result = await checkFilePermission("/path/to/accessible/file");

    expect(result).toBe(true);
    expect(mockAccess).toHaveBeenCalledTimes(1);
  });

  it("should return false when file access is denied or file is missing", async () => {
    mockAccess.mockRejectedValueOnce(
      new Error("ENOENT: no such file or directory"),
    );

    const result = await checkFilePermission("/path/to/missing/file");

    expect(result).toBe(false);
    expect(mockAccess).toHaveBeenCalledTimes(1);
  });

  it("should handle paths with special shell characters safely without throwing or executing commands", async () => {
    mockAccess.mockResolvedValueOnce(undefined);

    const result = await checkFilePermission(
      '/path/with; special $ characters & "quotes"',
    );

    expect(result).toBe(true);
    expect(mockAccess).toHaveBeenCalledWith(
      '/path/with; special $ characters & "quotes"',
      expect.any(Number),
    );
  });
});
