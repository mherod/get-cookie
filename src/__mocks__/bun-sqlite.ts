import { vi } from 'vitest';

export interface Statement {
  all: () => Promise<any[]>;
  get: () => Promise<any>;
  run: () => void;
  values: () => any[];
  columnNames: string[];
  finalize: () => void;
  toString: () => string;
}

const mockStatement: Statement = {
  all: vi.fn().mockResolvedValue([]),
  get: vi.fn(),
  run: vi.fn(),
  values: vi.fn(),
  columnNames: [],
  finalize: vi.fn(),
  toString: vi.fn(),
};

const mockQuery = vi.fn().mockReturnValue(mockStatement);

export class Database {
  constructor(filename: string) {}

  query(sql: string): Statement {
    return mockQuery(sql);
  }

  close(): void {
    vi.fn()();
  }
}

// Make mock functions available to tests
(Database as any).prototype.query = mockQuery;