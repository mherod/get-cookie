import BetterSqlite3 from "better-sqlite3";

import { querySqliteThenTransform } from "../QuerySqliteThenTransform";

// Mock better-sqlite3
jest.mock("better-sqlite3", () => {
  const mockPrepare = jest.fn();
  const mockAll = jest.fn();
  const mockClose = jest.fn();

  return jest.fn().mockImplementation(() => ({
    prepare: mockPrepare.mockReturnValue({ all: mockAll }),
    close: mockClose,
  }));
});

// Mock logger
jest.mock("@utils/logHelpers", () => ({
  logError: jest.fn(),
}));

describe("querySqliteThenTransform", () => {
  const mockDb = {
    prepare: jest.fn(),
    close: jest.fn(),
  };

  const mockStmt = {
    all: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.prepare.mockReturnValue(mockStmt);
    (BetterSqlite3 as unknown as jest.Mock).mockReturnValue(mockDb);
  });

  describe("Basic Functionality", () => {
    it("should execute a simple query without transformation", async () => {
      const testRows = [{ id: 1, name: "test" }];
      mockStmt.all.mockReturnValue(testRows);

      const result = await querySqliteThenTransform({
        file: "test.db",
        sql: "SELECT * FROM test",
      });

      expect(result).toEqual(testRows);
      expect(BetterSqlite3).toHaveBeenCalledWith("test.db", {
        readonly: true,
        fileMustExist: true,
      });
      expect(mockDb.prepare).toHaveBeenCalledWith("SELECT * FROM test");
      expect(mockStmt.all).toHaveBeenCalled();
      expect(mockDb.close).toHaveBeenCalled();
    });

    it("should apply row transformation", async () => {
      const testRows = [{ id: 1, name: "test" }];
      mockStmt.all.mockReturnValue(testRows);

      const result = await querySqliteThenTransform({
        file: "test.db",
        sql: "SELECT * FROM test",
        rowTransform: (row: { id: number; name: string }) => ({
          ...row,
          transformed: true,
        }),
      });

      expect(result).toEqual([{ id: 1, name: "test", transformed: true }]);
    });

    it("should apply row filtering", async () => {
      const testRows = [
        { id: 1, name: "keep" },
        { id: 2, name: "filter" },
      ];
      mockStmt.all.mockReturnValue(testRows);

      const result = await querySqliteThenTransform({
        file: "test.db",
        sql: "SELECT * FROM test",
        rowFilter: (row: { name: string }) => row.name === "keep",
      });

      expect(result).toEqual([{ id: 1, name: "keep" }]);
    });

    it("should handle query parameters", async () => {
      const params = ["test"];
      await querySqliteThenTransform({
        file: "test.db",
        sql: "SELECT * FROM test WHERE name = ?",
        params,
      });

      expect(mockStmt.all).toHaveBeenCalledWith(params);
    });
  });
});

describe("querySqliteThenTransform Error Handling", () => {
  const mockDb = {
    prepare: jest.fn(),
    close: jest.fn(),
  };

  const mockStmt = {
    all: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.prepare.mockReturnValue(mockStmt);
    (BetterSqlite3 as unknown as jest.Mock).mockReturnValue(mockDb);
  });

  it("should handle database open errors", async () => {
    const error = new Error("Failed to open database");
    (BetterSqlite3 as unknown as jest.Mock).mockImplementation(() => {
      throw error;
    });

    await expect(
      querySqliteThenTransform({
        file: "test.db",
        sql: "SELECT * FROM test",
      }),
    ).rejects.toThrow("Failed to open database");
  });

  it("should handle query preparation errors", async () => {
    const error = new Error("Invalid SQL");
    mockDb.prepare.mockImplementation(() => {
      throw error;
    });

    await expect(
      querySqliteThenTransform({
        file: "test.db",
        sql: "INVALID SQL",
      }),
    ).rejects.toThrow("Invalid SQL");
  });

  it("should handle query execution errors", async () => {
    const error = new Error("Query failed");
    mockStmt.all.mockImplementation(() => {
      throw error;
    });

    await expect(
      querySqliteThenTransform({
        file: "test.db",
        sql: "SELECT * FROM test",
      }),
    ).rejects.toThrow("Query failed");
  });

  it("should handle database close errors", async () => {
    mockStmt.all.mockReturnValue([]);
    const error = new Error("Failed to close database");
    mockDb.close.mockImplementation(() => {
      throw error;
    });

    await expect(
      querySqliteThenTransform({
        file: "test.db",
        sql: "SELECT * FROM test",
      }),
    ).rejects.toThrow("Failed to close database");
  });
});

describe("querySqliteThenTransform Edge Cases", () => {
  const mockDb = {
    prepare: jest.fn(),
    close: jest.fn(),
  };

  const mockStmt = {
    all: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.prepare.mockReturnValue(mockStmt);
    (BetterSqlite3 as unknown as jest.Mock).mockReturnValue(mockDb);
  });

  it("should handle empty result sets", async () => {
    mockStmt.all.mockReturnValue([]);

    const result = await querySqliteThenTransform({
      file: "test.db",
      sql: "SELECT * FROM test",
    });

    expect(result).toEqual([]);
  });

  it("should handle null values in transformation", async () => {
    const testRows = [{ id: 1, name: null }];
    mockStmt.all.mockReturnValue(testRows);

    const result = await querySqliteThenTransform({
      file: "test.db",
      sql: "SELECT * FROM test",
      rowTransform: (row: { id: number; name: string | null }) => ({
        ...row,
        nameLength: row.name?.length ?? 0,
      }),
    });

    expect(result).toEqual([{ id: 1, name: null, nameLength: 0 }]);
  });

  it("should handle complex transformations", async () => {
    const testRows = [{ id: 1, data: { nested: { value: "test" } } }];
    mockStmt.all.mockReturnValue(testRows);

    const result = await querySqliteThenTransform({
      file: "test.db",
      sql: "SELECT * FROM test",
      rowTransform: (row: {
        id: number;
        data: { nested: { value: string } };
      }) => ({
        id: row.id,
        value: row.data.nested.value,
      }),
    });

    expect(result).toEqual([{ id: 1, value: "test" }]);
  });
});
