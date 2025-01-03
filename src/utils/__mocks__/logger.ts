const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  withTag: jest.fn().mockReturnThis(),
};

/**
 * Mock logger for testing purposes
 * Provides jest mock functions for all logging methods
 * Each method (debug, info, warn, error, log) is a jest.fn() that can be used to verify calls
 * @example
 */
export default mockLogger;
