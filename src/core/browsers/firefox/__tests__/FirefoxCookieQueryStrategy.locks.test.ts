import fs from 'fs';
import os from 'os';
import path from 'path';

import { FirefoxCookieQueryStrategy } from '../FirefoxCookieQueryStrategy';

// Mock the ProcessDetector
jest.mock('@utils/ProcessDetector');

// Mock the logger to avoid console output during tests  
jest.mock('@utils/logHelpers', () => ({
  createTaggedLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
  }),
}));

// Mock the QuerySqliteThenTransform to simulate database operations
jest.mock('../../QuerySqliteThenTransform', () => ({
  querySqliteThenTransform: jest.fn(),
}));

// Mock fast-glob to control which files are found
jest.mock('fast-glob', () => ({
  sync: jest.fn(),
}));

interface MockProcessDetector {
  isFirefoxRunning: jest.Mock;
  getBrowserConflictAdvice: jest.Mock;
}

interface MockQuerySqlite {
  querySqliteThenTransform: jest.Mock;
}

interface MockFastGlob {
  sync: jest.Mock;
}

describe('FirefoxCookieQueryStrategy - Database Lock Handling', () => {
  let strategy: FirefoxCookieQueryStrategy;
  let tempDir: string;
  let mockCookieDbPath: string;

  beforeEach(() => {
    strategy = new FirefoxCookieQueryStrategy();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firefox-test-'));
    mockCookieDbPath = path.join(tempDir, 'cookies.sqlite');
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up process.env.HOME for the strategy
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    // Clean up temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('database lock error handling', () => {
    it('should call Firefox process detection when database lock error occurs', async () => {
      const { querySqliteThenTransform } = jest.requireMock<MockQuerySqlite>('../../QuerySqliteThenTransform');
      const { sync } = jest.requireMock<MockFastGlob>('fast-glob');
      const { isFirefoxRunning, getBrowserConflictAdvice } = jest.requireMock<MockProcessDetector>('@utils/ProcessDetector');
      
      // Mock finding Firefox cookie files
      sync.mockReturnValue([mockCookieDbPath]);
      
      // Mock database lock error
      const lockError = new Error('database is locked');
      querySqliteThenTransform.mockRejectedValue(lockError);
      
      // Mock Firefox process detection
      isFirefoxRunning.mockResolvedValue([
        { pid: 1234, command: 'firefox', details: 'firefox process' }
      ]);
      getBrowserConflictAdvice.mockReturnValue('Firefox is running - close it first');

      // Create a minimal SQLite database file
      createMockCookieDatabase(mockCookieDbPath);

      // Execute the query - it should handle the lock error internally
      const result = await strategy.queryCookies('test', 'example.com');
      
      // Should return empty array due to error handling
      expect(result).toEqual([]);
      
      // Verify that Firefox process detection was called
      expect(isFirefoxRunning).toHaveBeenCalled();
      expect(getBrowserConflictAdvice).toHaveBeenCalledWith('firefox', [
        { pid: 1234, command: 'firefox', details: 'firefox process' }
      ]);
    });

    it('should handle database lock with no Firefox processes detected', async () => {
      const { querySqliteThenTransform } = jest.requireMock<MockQuerySqlite>('../../QuerySqliteThenTransform');
      const { sync } = jest.requireMock<MockFastGlob>('fast-glob');
      const { isFirefoxRunning } = jest.requireMock<MockProcessDetector>('@utils/ProcessDetector');
      
      // Mock finding Firefox cookie files
      sync.mockReturnValue([mockCookieDbPath]);
      
      // Mock database lock error
      const lockError = new Error('database is locked');
      querySqliteThenTransform.mockRejectedValue(lockError);
      
      // Mock no Firefox processes
      isFirefoxRunning.mockResolvedValue([]);

      // Create a minimal SQLite database file
      createMockCookieDatabase(mockCookieDbPath);

      // Execute the query
      const result = await strategy.queryCookies('test', 'example.com');
      
      // Should return empty array due to error handling
      expect(result).toEqual([]);
      
      // Verify that Firefox process detection was called
      expect(isFirefoxRunning).toHaveBeenCalled();
    });
  });

  describe('SafeFileOperations integration', () => {
    it('should have SafeFileOperations available for fallback operations', () => {
      // This test verifies that the SafeFileOperations utility exists
      // and can be imported for use in database lock scenarios
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
        const SafeFileOperations = require('../../../../utils/SafeFileOperations').SafeFileOperations;
        expect(SafeFileOperations).toBeDefined();
      }).not.toThrow();
    });
  });
});

/**
 * Creates a minimal mock SQLite database file for testing
 */
function createMockCookieDatabase(dbPath: string): void {
  // Create directory if it doesn't exist
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create a minimal SQLite database file
  // This is just a placeholder - real SQLite integration would require more setup
  const mockSqliteHeader = Buffer.from([
    0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, // "SQLite format 3"
    0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00
  ]);
  
  fs.writeFileSync(dbPath, mockSqliteHeader);
}