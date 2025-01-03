const mockLogger = {
  withTag: (_tag: string) => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
};

/**
 * Mock logger for testing purposes
 * Provides jest mock functions for all logging methods
 * Each method (debug, info, warn, error) is a jest.fn() that can be used to verify calls
 *
 * @example
 */
export default mockLogger;
