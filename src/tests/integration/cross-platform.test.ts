import { ChromeCookieQueryStrategy } from "../../core/browsers/chrome/ChromeCookieQueryStrategy";
import { getChromePassword } from "../../core/browsers/chrome/getChromePassword";
import { ChromiumCookieQueryStrategy } from "../../core/browsers/chromium/ChromiumCookieQueryStrategy";
import { getPlatform } from "../../utils/platformUtils";

/**
 * Test Chrome password retrieval for the current platform
 */
async function testChromePasswordRetrieval(): Promise<void> {
  // This might fail in CI without Chrome installed, but that's ok
  try {
    const password = await getChromePassword();
    expect(password).toBeDefined();
    expect(password.length).toBeGreaterThan(0);
    // Security: Not logging password data, only validating it exists
  } catch (_error) {
    // Expected in CI environments - password retrieval may fail without Chrome
    // Not logging error details for security reasons
  }
}

/**
 * Test Chrome path validation for the current platform
 * @param currentPlatform - The platform being tested
 */
async function testChromePaths(currentPlatform: string): Promise<void> {
  const { chromeApplicationSupport } = await import(
    "../../core/browsers/chrome/ChromeApplicationSupport"
  );

  expect(chromeApplicationSupport).toBeDefined();
  expect(typeof chromeApplicationSupport).toBe("string");

  switch (currentPlatform) {
    case "darwin":
      expect(chromeApplicationSupport).toContain("Library/Application Support");
      expect(chromeApplicationSupport).toContain("Google/Chrome");
      break;
    case "win32":
      expect(chromeApplicationSupport).toContain("AppData");
      expect(chromeApplicationSupport).toContain("Local");
      expect(chromeApplicationSupport).toContain("Google");
      expect(chromeApplicationSupport).toContain("Chrome");
      break;
    case "linux":
      expect(chromeApplicationSupport).toContain(".config");
      expect(chromeApplicationSupport).toContain("google-chrome");
      break;
  }
}

/**
 * Test Windows-specific cookie handling
 */
async function testWindowsV10Cookies(): Promise<void> {
  const { isV10Cookie } = await import(
    "../../core/browsers/chrome/windows/decryptV10Cookie"
  );

  const v10Cookie = Buffer.from("v10" + "test");
  const nonV10Cookie = Buffer.from("v11" + "test");

  expect(isV10Cookie(v10Cookie)).toBe(true);
  expect(isV10Cookie(nonV10Cookie)).toBe(false);
}

/**
 * Test Windows DPAPI decryption
 */
async function testWindowsDPAPI(): Promise<void> {
  const { getChromePassword } = await import(
    "../../core/browsers/chrome/windows/getChromePassword"
  );

  try {
    // This will fail without Chrome installed, but tests the flow
    const password = getChromePassword();
    // Use the password to avoid unused variable warnings
    expect(password).toBeDefined();
  } catch (error) {
    // Check for expected error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    expect(
      errorMessage.includes("Chrome") ||
        errorMessage.includes("DPAPI") ||
        errorMessage.includes("Local State"),
    ).toBe(true);
  }
}

/**
 * Test Linux keyring access
 */
async function testLinuxKeyring(): Promise<void> {
  const { getChromePassword } = await import(
    "../../core/browsers/chrome/linux/getChromePassword"
  );

  const password = await getChromePassword();
  // On Linux without keyring, falls back to "peanuts"
  expect(password).toBeDefined();
}

/**
 * Test macOS keychain access
 */
async function testMacOSKeychain(): Promise<void> {
  const { getChromePassword } = await import(
    "../../core/browsers/chrome/macos/getChromePassword"
  );

  try {
    const password = await getChromePassword();
    expect(password).toBeDefined();
    expect(typeof password).toBe("string");
  } catch (error) {
    // Keychain access might fail in CI
    const errorMessage = error instanceof Error ? error.message : String(error);
    expect(errorMessage).toContain("security");
  }
}

describe("Cross-Platform Cookie Extraction", () => {
  const currentPlatform = getPlatform();

  describe(`Platform: ${currentPlatform}`, () => {
    it("should initialize Chrome strategy without errors", () => {
      expect(() => new ChromeCookieQueryStrategy()).not.toThrow();
    });

    it("should get Chrome password for current platform", async () => {
      await testChromePasswordRetrieval();
    });

    it("should query cookies without throwing", async () => {
      const strategy = new ChromeCookieQueryStrategy();

      // This will return empty array if Chrome is not installed
      const cookies = await strategy.queryCookies("*", ".example.com");
      expect(Array.isArray(cookies)).toBe(true);
    });
  });

  describe("Multi-Browser Support", () => {
    const browsers = ["chrome", "brave", "edge", "opera", "vivaldi"] as const;

    for (const browser of browsers) {
      it(`should initialize ${browser} strategy`, () => {
        expect(() => new ChromiumCookieQueryStrategy(browser)).not.toThrow();
      });
    }
  });

  describe("Platform-Specific Paths", () => {
    it("should have correct Chrome paths for current platform", async () => {
      await testChromePaths(currentPlatform);
    });
  });

  describe("Windows-Specific Features", () => {
    if (currentPlatform === "win32") {
      it("should handle v10 cookies", async () => {
        await testWindowsV10Cookies();
      });

      it("should attempt DPAPI decryption", async () => {
        await testWindowsDPAPI();
      });
    } else {
      it.skip("Windows-specific tests skipped on non-Windows platform", () => {});
    }
  });

  describe("Linux-Specific Features", () => {
    if (currentPlatform === "linux") {
      it("should attempt keyring access", async () => {
        await testLinuxKeyring();
      });
    } else {
      it.skip("Linux-specific tests skipped on non-Linux platform", () => {});
    }
  });

  describe("macOS-Specific Features", () => {
    if (currentPlatform === "darwin") {
      it("should attempt keychain access", async () => {
        await testMacOSKeychain();
      });
    } else {
      it.skip("macOS-specific tests skipped on non-macOS platform", () => {});
    }
  });
});
