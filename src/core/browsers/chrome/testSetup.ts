import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../listChromeProfiles";

import { ChromeCookieQueryStrategy } from "./ChromeCookieQueryStrategy";
import { dateToChromeMicroseconds } from "./chromeTimestamps";
import { decrypt } from "./decrypt";
import { getChromePassword } from "./getChromePassword";
import type { ChromeCookieRow } from "./types";

jest.mock("./decrypt");
jest.mock("./getChromePassword");
jest.mock("../getEncryptedChromeCookie");
jest.mock("../listChromeProfiles");

/**
 * Mock password used for testing
 */
export const mockPassword = "test-password";

/**
 * Mock cookie file path used for testing
 */
export const mockCookieFile = "/path/to/Cookies";

/**
 * Mock cookie data used for testing
 */
export const mockCookieData: ChromeCookieRow = {
  name: "test-cookie",
  value: Buffer.from("encrypted-value"),
  encrypted_value: Buffer.from("encrypted-value"),
  host_key: "example.com",
  path: "/",
  expires_utc: dateToChromeMicroseconds(new Date(Date.now() + 86400000)) ?? 0, // 1 day in the future
  is_secure: 0,
  is_httponly: 0,
  samesite: "",
};

/**
 * Store the original platform for restoration
 */
export const originalPlatform = process.platform;

/**
 * Sets up a Chrome test environment with mocked dependencies
 * @returns A configured ChromeCookieQueryStrategy instance
 */
export function setupChromeTest(): ChromeCookieQueryStrategy {
  // Mock process.platform before creating strategy
  Object.defineProperty(process, "platform", {
    value: "darwin",
    configurable: true,
  });

  // Setup default mock values before creating strategy
  (listChromeProfilePaths as unknown as jest.Mock).mockReturnValue([
    mockCookieFile,
  ]);
  (getChromePassword as unknown as jest.Mock).mockResolvedValue(mockPassword);
  (getEncryptedChromeCookie as unknown as jest.Mock).mockResolvedValue([
    mockCookieData,
  ]);
  (decrypt as unknown as jest.Mock).mockResolvedValue("decrypted-value");

  const strategy = new ChromeCookieQueryStrategy();
  return strategy;
}

/**
 * Restores the original platform value and resets mocks
 */
export function restorePlatform(): void {
  Object.defineProperty(process, "platform", {
    value: originalPlatform,
    configurable: true,
  });
  jest.resetAllMocks();
}

// Export mocked functions for test assertions
/**
 * Mock function for listChromeProfilePaths
 */
export const mockListChromeProfilePaths =
  listChromeProfilePaths as unknown as jest.Mock;

/**
 * Mock function for getChromePassword
 */
export const mockGetChromePassword = getChromePassword as unknown as jest.Mock;

/**
 * Mock function for getEncryptedChromeCookie
 */
export const mockGetEncryptedChromeCookie =
  getEncryptedChromeCookie as unknown as jest.Mock;

/**
 * Mock function for decrypt
 */
export const mockDecrypt = decrypt as unknown as jest.Mock;
