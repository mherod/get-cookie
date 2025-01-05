import type { ConsolaInstance } from "consola";

type MockLogFn = {
  (...args: unknown[]): void;
  raw: (...args: unknown[]) => void;
};

// Create mock log function
const createMockLogFn = (): MockLogFn => {
  const fn = jest.fn() as unknown as MockLogFn;
  fn.raw = jest.fn();
  return fn;
};

// Mock consola
const mockConsola = {
  success: createMockLogFn(),
  error: createMockLogFn(),
  warn: createMockLogFn(),
  info: createMockLogFn(),
  debug: createMockLogFn(),
  withTag: jest.fn(),
  options: {},
  _lastLog: null,
  level: 3,
  prompt: jest.fn(),
} as unknown as ConsolaInstance;

jest.mock("consola", () => ({
  __esModule: true,
  createConsola: () => mockConsola,
}));

describe("logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should expose logging methods", async () => {
    const { default: logger } = (await import("../logger")) as {
      default: ConsolaInstance;
    };
    expect(logger.success).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
  });
});
