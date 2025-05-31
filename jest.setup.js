const lodash = require("lodash");

jest.mock("lodash-es", () => lodash);
jest.mock("lodash-es/merge", () => require("lodash/merge"));
jest.mock("lodash-es/memoize", () => require("lodash/memoize"));
jest.mock("lodash-es/uniqBy", () => require("lodash/uniqBy"));

// Create a mock logger that can be reused
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  withTag: jest.fn(),
};

mockLogger.withTag.mockReturnValue(mockLogger);

// Mock the logger
jest.mock("@utils/logger", () => mockLogger);

// Mock logHelpers to ensure createTaggedLogger works
jest.mock("@utils/logHelpers", () => ({
  createTaggedLogger: jest.fn(() => mockLogger),
  logError: jest.fn(),
  logOperationResult: jest.fn(),
  logWarn: jest.fn(),
  logger: mockLogger,
}));

// Add any other global setup here
