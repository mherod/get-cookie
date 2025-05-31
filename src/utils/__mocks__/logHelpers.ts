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

// Set up withTag to return the mock logger itself
mockLogger.withTag.mockReturnValue(mockLogger);

/**
 * Mock implementation of createTaggedLogger for testing
 * @param _component - The component name (unused in mock)
 * @returns Mock logger instance
 */
export function createTaggedLogger(_component: string): typeof mockLogger {
  return mockLogger;
}

/**
 * Mock implementation of logError for testing
 * @param _message - The error message (unused in mock)
 * @param _error - The error object (unused in mock)
 * @param _context - Additional context (unused in mock)
 */
export function logError(
  _message: string,
  _error: unknown,
  _context?: unknown,
): void {
  // Mock implementation
}

/**
 * Mock implementation of logOperationResult for testing
 * @param _operation - The operation name (unused in mock)
 * @param _success - Whether operation succeeded (unused in mock)
 * @param _context - Additional context (unused in mock)
 */
export function logOperationResult(
  _operation: string,
  _success: boolean,
  _context?: unknown,
): void {
  // Mock implementation
}

/**
 * Mock implementation of logWarn for testing
 * @param _component - The component name (unused in mock)
 * @param _message - The warning message (unused in mock)
 * @param _context - Additional context (unused in mock)
 */
export function logWarn(
  _component: string,
  _message: string,
  _context?: unknown,
): void {
  // Mock implementation
}

/**
 * Re-export the mock logger
 * @returns Mock logger instance
 */
export { default as logger } from "./logger";
