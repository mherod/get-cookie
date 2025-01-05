import { jest } from "@jest/globals";

import type { CookieRow } from "../../../../types/schemas";
import { getEncryptedChromeCookie } from "../../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../../listChromeProfiles";
import { ChromeCookieQueryStrategy } from "../ChromeCookieQueryStrategy";
import { decrypt } from "../decrypt";
import { getChromePassword } from "../getChromePassword";

jest.mock("../decrypt");
jest.mock("../getChromePassword");
jest.mock("../../getEncryptedChromeCookie");
jest.mock("../../listChromeProfiles");

const mockListChromeProfilePaths = jest.mocked(listChromeProfilePaths);
const mockGetEncryptedChromeCookie = jest.mocked(getEncryptedChromeCookie);
const mockGetChromePassword = jest.mocked(getChromePassword);
const mockDecrypt = jest.mocked(decrypt);

describe("ChromeCookieQueryStrategy - Success", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully query and decrypt cookies", async () => {
    const mockCookieValue = Buffer.from("encrypted-cookie");
    const mockPassword = "mock-password";
    const mockDecryptedValue = "decrypted-value";

    // Convert 24 hours from now to Chrome's timestamp format
    // First get Unix timestamp in microseconds (multiply by 1000000)
    // Then add the difference between Chrome epoch and Unix epoch in microseconds
    const unixMicroseconds = (Date.now() + 86400000) * 1000;
    const chromeEpochDiffMicroseconds = 11644473600000 * 1000;
    const chromeTimestamp = unixMicroseconds + chromeEpochDiffMicroseconds;

    mockListChromeProfilePaths.mockReturnValue(["/path/to/profile"]);
    mockGetChromePassword.mockResolvedValue(mockPassword);
    mockGetEncryptedChromeCookie.mockResolvedValue([
      {
        name: "test-cookie",
        value: mockCookieValue,
        domain: "example.com",
        expiry: chromeTimestamp,
      } satisfies CookieRow,
    ]);
    mockDecrypt.mockResolvedValue(mockDecryptedValue);

    const strategy = new ChromeCookieQueryStrategy();
    const cookies = await strategy.queryCookies("%", "example.com");

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: "test-cookie",
      value: mockDecryptedValue,
      domain: "example.com",
      meta: {
        browser: "Chrome",
        decrypted: true,
      },
    });

    // Verify the expiry is a valid Unix timestamp in milliseconds
    expect(typeof cookies[0].expiry).toBe("number");
    const expiryDate = new Date(cookies[0].expiry as number);
    expect(expiryDate.getTime()).toBeGreaterThan(Date.now());
    expect(expiryDate.getTime()).toBeLessThan(Date.now() + 86401000); // 24 hours + 1 second

    expect(mockListChromeProfilePaths).toHaveBeenCalled();
    expect(mockGetChromePassword).toHaveBeenCalled();
    expect(mockGetEncryptedChromeCookie).toHaveBeenCalledWith({
      name: "%",
      domain: "example.com",
      file: "/path/to/profile",
    });
    expect(mockDecrypt).toHaveBeenCalledWith(mockCookieValue, mockPassword);
  });
});
