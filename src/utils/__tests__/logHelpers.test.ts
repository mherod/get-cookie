import type { ConsolaInstance } from "consola";

import logger from "../logger";
import {
  createTaggedLogger,
  logError,
  logOperationResult,
  logWarn,
} from "../logHelpers";

// Mock the logger
jest.mock("../logger", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    withTag: jest.fn(),
  },
}));

describe("logOperationResult", () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log success message when operation succeeds", () => {
    logOperationResult("TestOperation", true);
    expect(mockLogger.success).toHaveBeenCalledWith(
      "TestOperation succeeded",
      undefined,
    );
  });

  it("should log error message when operation fails", () => {
    logOperationResult("TestOperation", false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "TestOperation failed",
      undefined,
    );
  });

  it("should include context in success message", () => {
    const context = { data: "test" };
    logOperationResult("TestOperation", true, context);
    expect(mockLogger.success).toHaveBeenCalledWith(
      "TestOperation succeeded",
      context,
    );
  });

  it("should include context in error message", () => {
    const context = { data: "test" };
    logOperationResult("TestOperation", false, context);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "TestOperation failed",
      context,
    );
  });
});

describe("logError", () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log error message with Error instance", () => {
    const error = new Error("Test error");
    logError("Something went wrong", error);
    expect(mockLogger.error).toHaveBeenCalledWith("Something went wrong", {
      error: "Test error",
    });
  });

  it("should log error message with string error", () => {
    logError("Something went wrong", "Test error");
    expect(mockLogger.error).toHaveBeenCalledWith("Something went wrong", {
      error: "Test error",
    });
  });

  it("should include context in error message", () => {
    const error = new Error("Test error");
    const context = { data: "test" };
    logError("Something went wrong", error, context);
    expect(mockLogger.error).toHaveBeenCalledWith("Something went wrong", {
      ...context,
      error: "Test error",
    });
  });

  it("should handle non-Error objects", () => {
    const error = { custom: "error" };
    logError("Something went wrong", error);
    expect(mockLogger.error).toHaveBeenCalledWith("Something went wrong", {
      error: "[object Object]",
    });
  });
});

describe("logWarn", () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log warning message with component", () => {
    logWarn("TestComponent", "Warning message");
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "[TestComponent] Warning message",
      undefined,
    );
  });

  it("should include context in warning message", () => {
    const context = { data: "test" };
    logWarn("TestComponent", "Warning message", context);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "[TestComponent] Warning message",
      context,
    );
  });
});

describe("createTaggedLogger", () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockTaggedLogger = {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  } as unknown as ConsolaInstance;

  const withTagMock = jest.fn().mockReturnValue(mockTaggedLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.withTag = withTagMock;
  });

  it("should create logger with component tag", () => {
    createTaggedLogger("TestComponent");
    expect(withTagMock).toHaveBeenCalledWith("TestComponent");
  });

  it("should return logger instance with tag", () => {
    const result = createTaggedLogger("TestComponent");
    expect(result).toBe(mockTaggedLogger);
  });
});
