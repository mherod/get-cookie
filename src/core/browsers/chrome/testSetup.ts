import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../listChromeProfiles";

import { ChromeCookieQueryStrategy } from "./ChromeCookieQueryStrategy";
import { decrypt } from "./decrypt";
import * as chromePassword from "./getChromePassword";

// Mock dependencies
jest.mock("../listChromeProfiles");
jest.mock("../getEncryptedChromeCookie");
jest.mock("./decrypt");

// Mock the logger
jest.mock("@utils/logger", () => ({
  __esModule: true,
  default: {
    withTag: () => ({
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

/**
 * Mock password used for testing
 *
 * @example
 * // Use in test setup
 * const password = mockPassword;
 * expect(password).toBe('test-password');
 */
export const mockPassword = "test-password";

/**
 * Mock cookie file path used for testing
 *
 * @example
 * // Use in test setup
 * const cookieFile = mockCookieFile;
 * expect(cookieFile).toBe('/path/to/Cookies');
 */
export const mockCookieFile = "/path/to/Cookies";

/**
 * Mock cookie data used for testing
 *
 * @example
 * // Use in test setup
 * const cookieData = mockCookieData;
 * expect(cookieData).toMatchObject({
 *   name: 'test-cookie',
 *   domain: 'example.com'
 * });
 */
export const mockCookieData = {
  name: "test-cookie",
  value: Buffer.from("encrypted-value"),
  domain: "example.com",
  expiry: Date.now() + 86400000, // 1 day in the future
};

/**
 * Sets up a Chrome test environment with mocked dependencies
 *
 * @returns A configured ChromeCookieQueryStrategy instance
 * @example
 * // Set up test environment
 * const strategy = setupChromeTest();
 *
 * // Use in test
 * const cookies = await strategy.queryCookies('test-cookie', 'example.com');
 * expect(cookies).toHaveLength(1);
 * expect(cookies[0].value).toBe('decrypted-value');
 */
export function setupChromeTest(): ChromeCookieQueryStrategy {
  const strategy = new ChromeCookieQueryStrategy();
  Object.defineProperty(process, "platform", {
    value: "darwin",
  });

  // Setup mocks
  jest.mocked(listChromeProfilePaths).mockReturnValue([mockCookieFile]);
  jest
    .spyOn(chromePassword, "getChromePassword")
    .mockImplementation(() => Promise.resolve(mockPassword));
  jest.mocked(getEncryptedChromeCookie).mockResolvedValue([mockCookieData]);
  jest.mocked(decrypt).mockResolvedValue("decrypted-value");

  jest.clearAllMocks();

  return strategy;
}

/**
 * Re-export dependencies for convenience
 *
 * @example
 * // Import test utilities
 * import { getEncryptedChromeCookie, decrypt } from './testSetup';
 *
 * // Use in test
 * jest.mocked(decrypt).mockResolvedValue('test-value');
 * jest.mocked(getEncryptedChromeCookie).mockResolvedValue([mockCookieData]);
 */
export {
  getEncryptedChromeCookie,
  listChromeProfilePaths,
  decrypt,
  chromePassword,
};
