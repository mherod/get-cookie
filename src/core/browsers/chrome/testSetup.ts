import { getEncryptedChromeCookie } from '../getEncryptedChromeCookie';
import { listChromeProfilePaths } from '../listChromeProfiles';

import { ChromeCookieQueryStrategy } from './ChromeCookieQueryStrategy';
import { decrypt } from './decrypt';
import * as chromePassword from './getChromePassword';

// Mock dependencies
jest.mock('../listChromeProfiles');
jest.mock('../getEncryptedChromeCookie');
jest.mock('./decrypt');

// Mock the logger
jest.mock('@utils/logger', () => ({
  __esModule: true,
  default: {
    withTag: () => ({
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })
  }
}));

/** Mock password used for testing */
export const mockPassword = 'test-password';

/** Mock cookie file path used for testing */
export const mockCookieFile = '/path/to/Cookies';

/** Mock cookie data used for testing */
export const mockCookieData = {
  name: 'test-cookie',
  value: Buffer.from('encrypted-value'),
  domain: 'example.com',
  expiry: Date.now() + 86400000 // 1 day in the future
};

/**
 * Sets up a Chrome test environment with mocked dependencies
 * @returns A configured ChromeCookieQueryStrategy instance
 */
export function setupChromeTest(): ChromeCookieQueryStrategy {
  const strategy = new ChromeCookieQueryStrategy();
  Object.defineProperty(process, 'platform', {
    value: 'darwin'
  });

  // Setup mocks
  jest.mocked(listChromeProfilePaths).mockReturnValue([mockCookieFile]);
  jest.spyOn(chromePassword, 'getChromePassword').mockImplementation(() => Promise.resolve(mockPassword));
  jest.mocked(getEncryptedChromeCookie).mockResolvedValue([mockCookieData]);
  jest.mocked(decrypt).mockResolvedValue('decrypted-value');

  jest.clearAllMocks();

  return strategy;
}

/** Re-export dependencies for convenience */
export { getEncryptedChromeCookie, listChromeProfilePaths, decrypt, chromePassword };
