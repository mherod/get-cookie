import { homedir } from "os";

import type { BinaryCookieRow } from "../../../../types/schemas";
import { decodeBinaryCookies } from "../decodeBinaryCookies";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";

// Mock decodeBinaryCookies
jest.mock("../decodeBinaryCookies");

// Mock os.homedir and path.join
jest.mock("os", () => ({
  homedir: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

describe("SafariCookieQueryStrategy - Core", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;
  const originalHome = process.env.HOME;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    process.env.HOME = "/mock/home";
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  describe("Basic Functionality", () => {
    it("should return 'Safari' as the browser name", () => {
      expect(strategy.browserName).toBe("Safari");
    });

    it("should return empty array when HOME is not set", async () => {
      mockHomedir.mockReturnValue("");
      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toEqual([]);
    });

    it("should successfully decode and filter cookies", async () => {
      const mockCookies: BinaryCookieRow[] = [
        {
          name: "test-cookie",
          value: "test-value",
          domain: "example.com",
          path: "/",
          creation: 1234567890,
          expiry: 1234567890,
        },
      ];

      mockDecodeBinaryCookies.mockReturnValue(mockCookies);

      const cookies = await strategy.queryCookies("test-cookie", "example.com");
      expect(cookies).toHaveLength(1);
      expect(cookies[0]).toMatchObject({
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
      });
    });
  });
});

describe("SafariCookieQueryStrategy - Domain Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle cookies with leading dot in domain", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: ".example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].domain).toBe("example.com");
  });
});

describe("SafariCookieQueryStrategy - Error Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle decoding errors gracefully", async () => {
    mockDecodeBinaryCookies.mockImplementation(() => {
      throw new Error("Failed to decode");
    });

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });

  it("should handle cookies with invalid expiry", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: -1,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toBe("Infinity");
  });

  it("should handle missing cookie file", async () => {
    mockDecodeBinaryCookies.mockImplementation(() => {
      const error = new Error("ENOENT: no such file or directory");
      (error as NodeJS.ErrnoException).code = "ENOENT";
      throw error;
    });

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Path Resolution", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should resolve cookie file path correctly for macOS", async () => {
    await strategy.queryCookies("test-cookie", "example.com");

    expect(mockDecodeBinaryCookies).toHaveBeenCalledWith(
      "/Users/testuser/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
    );
  });

  it("should handle missing HOME directory gracefully", async () => {
    mockHomedir.mockReturnValue("");
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Value Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle Buffer cookie values", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: Buffer.from("test-value"),
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("test-value");
  });

  it("should handle non-string cookie values", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: 123,
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("123");
  });
});

describe("SafariCookieQueryStrategy - Date Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle expired cookies (expiry = 0)", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 0,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toBe("Infinity");
  });
});

describe("SafariCookieQueryStrategy - Store Path Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should use custom store path when provided", async () => {
    const customPath = "/custom/path/to/Cookies.binarycookies";
    await strategy.queryCookies("test-cookie", "example.com", customPath);
    expect(mockDecodeBinaryCookies).toHaveBeenCalledWith(customPath);
  });
});

describe("SafariCookieQueryStrategy - Error Logging", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle non-Error objects in catch block", async () => {
    mockDecodeBinaryCookies.mockImplementation(() => {
      throw new Error("Not a string error");
    });

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Domain Filtering", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should match subdomain cookies", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "sub.example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].domain).toBe("sub.example.com");
  });
});

describe("SafariCookieQueryStrategy - Wildcard Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle wildcard name", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "any-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("%", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("any-cookie");
  });

  it("should handle wildcard domain", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "any-domain.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "%");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].domain).toBe("any-domain.com");
  });

  it("should handle empty name and domain", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("", "");
    expect(cookies).toHaveLength(1);
  });
});

describe("SafariCookieQueryStrategy - Empty Results", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle empty cookie array from decodeBinaryCookies", async () => {
    mockDecodeBinaryCookies.mockReturnValue([]);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Double Wildcard", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle both name and domain wildcards", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "any-cookie",
        value: "test-value",
        domain: "any-domain.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("%", "%");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("any-cookie");
    expect(cookies[0].domain).toBe("any-domain.com");
  });
});

describe("SafariCookieQueryStrategy - Home Directory Edge Cases", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    jest.clearAllMocks();
  });

  it("should handle non-string homedir return value", async () => {
    mockHomedir.mockReturnValue(undefined as unknown as string);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });

  it("should handle null homedir return value", async () => {
    mockHomedir.mockReturnValue(null as unknown as string);
    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toEqual([]);
  });
});

describe("SafariCookieQueryStrategy - Cookie Metadata", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should include correct meta information in cookies", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].meta).toEqual({
      file: "/Users/testuser/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
      browser: "Safari",
      decrypted: false,
      secure: false,
      httpOnly: false,
      path: "/",
      version: undefined,
      comment: undefined,
      commentURL: undefined,
      port: undefined,
      creation: 1234567890 * 1000,
    });
  });
});

describe("SafariCookieQueryStrategy - Undefined Values", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle undefined cookie value", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: undefined as unknown as string,
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("undefined");
  });

  it("should handle undefined cookie domain", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: undefined as unknown as string,
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(0);
  });

  it("should handle undefined cookie name", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: undefined as unknown as string,
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(0);
  });
});

describe("SafariCookieQueryStrategy - Cookie Properties", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle undefined expiry", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: undefined as unknown as number,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toBeInstanceOf(Date);
    expect(isNaN(cookies[0].expiry as unknown as number)).toBe(true);
  });

  it("should handle undefined path", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: undefined as unknown as string,
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
  });

  it("should handle undefined creation", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: undefined as unknown as number,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
  });

  it("should handle negative expiry", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: -1,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toBe("Infinity");
  });
});

describe("SafariCookieQueryStrategy - Cookie Flags", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle cookies with flags", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
        flags: 5, // Secure (1) + HTTPOnly (4)
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].meta?.secure).toBe(true);
    expect(cookies[0].meta?.httpOnly).toBe(true);
  });

  it("should handle cookies with version", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
        version: 1,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].meta?.version).toBe(1);
  });
});

describe("SafariCookieQueryStrategy - Extended Properties", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle cookies with comments", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
        comment: "Test comment",
        commentURL: "https://example.com/cookie-info",
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].meta?.comment).toBe("Test comment");
    expect(cookies[0].meta?.commentURL).toBe("https://example.com/cookie-info");
  });

  it("should handle cookies with port numbers", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
        port: 8080,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].meta?.port).toBe(8080);
  });
});

describe("SafariCookieQueryStrategy - Wildcard Matching", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle wildcard name matching", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie-1",
        value: "value-1",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
      {
        name: "test-cookie-2",
        value: "value-2",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("%", "example.com");
    expect(cookies).toHaveLength(2);
  });

  it("should handle wildcard domain matching", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "value-1",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
      {
        name: "test-cookie",
        value: "value-2",
        domain: "test.com",
        path: "/",
        creation: 1234567890,
        expiry: 1234567890,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "%");
    expect(cookies).toHaveLength(2);
  });
});

describe("SafariCookieQueryStrategy - Date Handling", () => {
  let strategy: SafariCookieQueryStrategy;
  const mockDecodeBinaryCookies = decodeBinaryCookies as jest.MockedFunction<
    typeof decodeBinaryCookies
  >;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    strategy = new SafariCookieQueryStrategy();
    mockHomedir.mockReturnValue("/Users/testuser");
    jest.clearAllMocks();
  });

  it("should handle undefined expiry", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: undefined as unknown as number,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toBeInstanceOf(Date);
    expect(isNaN(cookies[0].expiry as unknown as number)).toBe(true);
  });

  it("should handle session cookies (expiry = 0)", async () => {
    const mockCookies: BinaryCookieRow[] = [
      {
        name: "test-cookie",
        value: "test-value",
        domain: "example.com",
        path: "/",
        creation: 1234567890,
        expiry: 0,
      },
    ];

    mockDecodeBinaryCookies.mockReturnValue(mockCookies);

    const cookies = await strategy.queryCookies("test-cookie", "example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expiry).toBe("Infinity");
  });
});
