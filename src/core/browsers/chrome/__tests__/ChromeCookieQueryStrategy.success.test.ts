import { jest } from "@jest/globals";

import { listChromeProfilePaths } from "../../listChromeProfiles";
import { CookieQueryBuilder } from "../../sql/CookieQueryBuilder";
import { getGlobalConnectionManager } from "../../sql/DatabaseConnectionManager";
import { getGlobalQueryMonitor } from "../../sql/QueryMonitor";
import { ChromeCookieQueryStrategy } from "../ChromeCookieQueryStrategy";
import { decrypt } from "../decrypt";
import { getChromiumPassword } from "../getChromiumPassword";

jest.mock("../decrypt");
jest.mock("../getChromiumPassword");
jest.mock("../../listChromeProfiles");
jest.mock("../../sql/DatabaseConnectionManager");
jest.mock("../../sql/QueryMonitor");
jest.mock("../../sql/CookieQueryBuilder");

const mockListChromeProfilePaths = jest.mocked(listChromeProfilePaths);
const mockGetChromiumPassword = jest.mocked(getChromiumPassword);
const mockDecrypt = jest.mocked(decrypt);
const mockGetGlobalConnectionManager = jest.mocked(getGlobalConnectionManager);
const mockGetGlobalQueryMonitor = jest.mocked(getGlobalQueryMonitor);
const mockCookieQueryBuilder = jest.mocked(CookieQueryBuilder);

describe("ChromeCookieQueryStrategy - Success", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully query and decrypt cookies", async () => {
    const mockCookieValue = Buffer.from("encrypted-cookie");
    const mockPassword = "mock-password";
    const mockDecryptedValue = "decrypted-value";

    mockListChromeProfilePaths.mockReturnValue(["/path/to/profile"]);
    mockGetChromiumPassword.mockResolvedValue(mockPassword);

    // Setup SQL utility mocks
    // biome-ignore lint/suspicious/noExplicitAny: Mock objects in tests need flexible types
    const mockExecuteQuery = jest.fn().mockImplementation((...args: any[]) => {
      const [_file, callback] = args;
      return callback({});
    });

    const mockConnectionManager = {
      executeQuery: mockExecuteQuery,
      // biome-ignore lint/suspicious/noExplicitAny: Mock objects in tests need flexible types
    } as any;

    const mockMonitor = {
      executeQuery: jest.fn().mockReturnValue([
        {
          encrypted_value: mockCookieValue,
          name: "test-cookie",
          domain: "example.com",
          expiry: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
        },
      ]),
      // biome-ignore lint/suspicious/noExplicitAny: Mock objects in tests need flexible types
    } as any;

    const mockQueryBuilder = {
      buildSelectQuery: jest.fn().mockReturnValue({
        sql: "SELECT * FROM cookies",
        params: {},
      }),
      // biome-ignore lint/suspicious/noExplicitAny: Mock objects in tests need flexible types
    } as any;

    mockGetGlobalConnectionManager.mockReturnValue(mockConnectionManager);
    mockGetGlobalQueryMonitor.mockReturnValue(mockMonitor);
    mockCookieQueryBuilder.mockImplementation(() => mockQueryBuilder);

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
    expect(mockGetChromiumPassword).toHaveBeenCalled();
    expect(mockGetGlobalConnectionManager).toHaveBeenCalled();
    expect(mockGetGlobalQueryMonitor).toHaveBeenCalled();
    expect(mockDecrypt).toHaveBeenCalledWith(mockCookieValue, mockPassword, 0);
  });
});
