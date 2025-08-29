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

    mockListChromeProfilePaths.mockReturnValue(["/path/to/profile"]);
    mockGetChromePassword.mockResolvedValue(mockPassword);
    mockGetEncryptedChromeCookie.mockResolvedValue([
      {
        name: "test-cookie",
        value: mockCookieValue,
        domain: "example.com",
        expiry: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
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
    });

    expect(mockListChromeProfilePaths).toHaveBeenCalled();
    expect(mockGetChromePassword).toHaveBeenCalled();
    expect(mockGetEncryptedChromeCookie).toHaveBeenCalledWith({
      name: "%",
      domain: "example.com",
      file: "/path/to/profile",
    });
    expect(mockDecrypt).toHaveBeenCalledWith(mockCookieValue, mockPassword, 0);
  });
});
