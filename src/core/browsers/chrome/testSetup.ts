import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../listChromeProfiles";

import { ChromeCookieQueryStrategy } from "./ChromeCookieQueryStrategy";
import { decrypt } from "./decrypt";
import { getChromiumPassword } from "./getChromiumPassword";

jest.mock("./decrypt");
jest.mock("./getChromiumPassword");
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
export const mockCookieData = {
  name: "test-cookie",
  value: Buffer.from("encrypted-value"),
  domain: "example.com",
  expiry: Date.now() + 86400000, // 1 day in the future
};

/**
 * Sets up a Chrome test environment with mocked dependencies
 * @returns A configured ChromeCookieQueryStrategy instance
 */
export function setupChromeTest(): ChromeCookieQueryStrategy {
  const strategy = new ChromeCookieQueryStrategy();
  Object.defineProperty(process, "platform", {
    value: "darwin",
  });

  // Setup default mock values without resetting
  (listChromeProfilePaths as unknown as jest.Mock).mockReturnValue([
    mockCookieFile,
  ]);
  (getChromiumPassword as unknown as jest.Mock).mockResolvedValue(mockPassword);
  (getEncryptedChromeCookie as unknown as jest.Mock).mockResolvedValue([
    mockCookieData,
  ]);
  (decrypt as unknown as jest.Mock).mockResolvedValue("decrypted-value");

  return strategy;
}

// Export mocked functions for test assertions
/**
 *
 */
export const mockListChromeProfilePaths =
  listChromeProfilePaths as unknown as jest.Mock;
/**
 *
 */
export const mockGetChromiumPassword =
  getChromiumPassword as unknown as jest.Mock;
/**
 *
 */
export const mockGetEncryptedChromeCookie =
  getEncryptedChromeCookie as unknown as jest.Mock;
/**
 *
 */
export const mockDecrypt = decrypt as unknown as jest.Mock;
