import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { BrowserName } from "@utils/BrowserControl";
import { getPlatform, isWindows, type Platform } from "@utils/platformUtils";

const execFileAsync = promisify(execFile);

/**
 * Interface for platform-specific browser control operations
 * Following SOLID principles - Interface Segregation
 */
export interface PlatformBrowserControl {
  /**
   * Check if the browser is supported on this platform
   * @param browserName - The name of the browser to check
   * @returns True if the browser is supported on this platform
   */
  isBrowserSupported(browserName: BrowserName): boolean;

  /**
   * Get executable names for a browser on this platform
   * @param browserName - The name of the browser
   * @returns Array of executable names for the browser
   */
  getBrowserExecutables(browserName: BrowserName): string[];

  /**
   * Launch a browser on this platform
   * @param browserName - The name of the browser to launch
   * @returns Promise that resolves when the browser is launched
   * @throws {Error} When the browser is not supported or cannot be launched
   */
  launchBrowser(browserName: BrowserName): Promise<void>;

  /**
   * Get the platform name
   * @returns The name of the current platform
   */
  getPlatformName(): string;

  /**
   * Check if a browser is installed
   * @param browserName - The name of the browser to check
   * @returns Promise that resolves to true if the browser is installed
   */
  isBrowserInstalled(browserName: BrowserName): Promise<boolean>;
}

/**
 * Base implementation with common functionality
 * Following DRY principle
 */
export abstract class BasePlatformBrowserControl
  implements PlatformBrowserControl
{
  protected readonly browserExecutables: Partial<Record<BrowserName, string[]>>;

  /**
   * Creates a new instance of BasePlatformBrowserControl
   */
  public constructor() {
    this.browserExecutables = this.initializeBrowserExecutables();
  }

  /**
   * Initialize browser executables for this platform
   * @returns Record mapping browser names to their executable names
   */
  protected abstract initializeBrowserExecutables(): Partial<
    Record<BrowserName, string[]>
  >;

  public isBrowserSupported(browserName: BrowserName): boolean {
    const executables = this.browserExecutables[browserName];
    return Boolean(executables && executables.length > 0);
  }

  public getBrowserExecutables(browserName: BrowserName): string[] {
    return this.browserExecutables[browserName] || [];
  }

  /**
   * Launch a browser on this platform
   * @param browserName - The name of the browser to launch
   * @returns Promise that resolves when the browser is launched
   * @throws {Error} When the browser is not supported or cannot be launched
   */
  public abstract launchBrowser(browserName: BrowserName): Promise<void>;

  /**
   * Get the platform name
   * @returns The name of the current platform
   */
  public abstract getPlatformName(): string;

  /**
   * Default implementation to check if browser is installed
   * Can be overridden by platform-specific implementations
   * @param browserName - The name of the browser to check
   * @returns Promise that resolves to true if the browser is installed
   */
  public async isBrowserInstalled(browserName: BrowserName): Promise<boolean> {
    const executables = this.getBrowserExecutables(browserName);

    for (const exe of executables) {
      try {
        // Try to check if executable exists using 'which' or 'where'
        const checkCommand = isWindows() ? "where" : "which";
        await execFileAsync(checkCommand, [exe], { timeout: 1000 });
        return true;
      } catch {
        // Continue checking other executables
      }
    }

    return false;
  }

  /**
   * Execute command helper with proper escaping
   * @param command - The command to execute
   * @param args - Arguments to pass to the command
   * @returns Promise that resolves when the command completes
   */
  protected async executeCommand(
    command: string,
    args: string[] = [],
  ): Promise<void> {
    try {
      await execFileAsync(command, args, {
        timeout: 5000,
        windowsHide: true,
      });
    } catch (error: unknown) {
      // Log but don't throw - browser may still launch
      if (this.isNodeError(error) && error.code !== "ENOENT") {
        console.debug(
          `Browser launch warning: ${BasePlatformBrowserControl.getErrorMessage(error)}`,
        );
      }
    }
  }

  /**
   * Helper to check if error is a Node.js error with code property
   * @param error - The error to check
   * @returns True if the error has a code property
   */
  private isNodeError(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
    );
  }

  /**
   * Helper to get error message from unknown error
   * @param error - The error to get message from
   * @returns Error message as string
   */
  protected static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return String(error);
  }
}

/**
 * macOS implementation for browser control operations
 * Handles browser launching using AppleScript on macOS systems
 */
export class MacOSBrowserControl extends BasePlatformBrowserControl {
  /**
   * Initialize browser executables for macOS platform
   * @returns Record mapping browser names to their executable names on macOS
   */
  protected initializeBrowserExecutables(): Partial<
    Record<BrowserName, string[]>
  > {
    return {
      Firefox: ["Firefox"],
      Chrome: ["Google Chrome"],
      Safari: ["Safari"],
    };
  }

  /**
   * Launch a browser on macOS using AppleScript
   * @param browserName - The name of the browser to launch
   * @returns Promise that resolves when the browser is launched
   * @throws {Error} When the browser is not supported on macOS
   */
  public async launchBrowser(browserName: BrowserName): Promise<void> {
    const appNames: Partial<Record<BrowserName, string>> = {
      Firefox: "Firefox",
      Chrome: "Google Chrome",
      Safari: "Safari",
    };

    const appName = appNames[browserName];
    if (!appName) {
      throw new Error(`${browserName} not supported on macOS`);
    }

    // Use osascript with proper argument separation to avoid injection
    await this.executeCommand("osascript", [
      "-e",
      `tell application "${appName}" to activate`,
    ]);
  }

  /**
   * Get the platform name for macOS
   * @returns The platform name "macOS"
   */
  public getPlatformName(): string {
    return "macOS";
  }
}

/**
 * Windows implementation for browser control operations
 * Handles browser launching using cmd.exe start command on Windows systems
 */
export class WindowsBrowserControl extends BasePlatformBrowserControl {
  /**
   * Initialize browser executables for Windows platform
   * @returns Record mapping browser names to their executable names on Windows
   */
  protected initializeBrowserExecutables(): Partial<
    Record<BrowserName, string[]>
  > {
    return {
      Firefox: ["firefox.exe", "Firefox"],
      Chrome: ["chrome.exe", "Google Chrome"],
      Safari: [], // Not available on Windows
    };
  }

  /**
   * Launch a browser on Windows using cmd.exe start command
   * @param browserName - The name of the browser to launch
   * @returns Promise that resolves when the browser is launched
   * @throws {Error} When the browser is not available or fails to launch
   */
  public async launchBrowser(browserName: BrowserName): Promise<void> {
    const executables = this.getBrowserExecutables(browserName);

    if (executables.length === 0) {
      throw new Error(`${browserName} not available on Windows`);
    }

    // Try each executable until one works
    for (const exe of executables) {
      if (await this.tryLaunchExecutable(exe)) {
        return; // Success, exit early
      }
    }

    throw new Error(`Failed to launch ${browserName} on Windows`);
  }

  /**
   * Try to launch a specific executable on Windows
   * @param exe - The executable name to launch
   * @returns Promise that resolves to true if launch was successful
   */
  private async tryLaunchExecutable(exe: string): Promise<boolean> {
    try {
      // Use cmd.exe with /c flag to run start command safely
      await execFileAsync("cmd.exe", ["/c", "start", "", exe], {
        timeout: 5000,
        windowsHide: true,
      });
      return true;
    } catch {
      // Try next executable
      return false;
    }
  }

  /**
   * Get the platform name for Windows
   * @returns The platform name "Windows"
   */
  public getPlatformName(): string {
    return "Windows";
  }
}

/**
 * Linux implementation for browser control operations
 * Handles browser launching using direct executable calls or xdg-open on Linux systems
 */
export class LinuxBrowserControl extends BasePlatformBrowserControl {
  /**
   * Initialize browser executables for Linux platform
   * @returns Record mapping browser names to their executable names on Linux
   */
  protected initializeBrowserExecutables(): Partial<
    Record<BrowserName, string[]>
  > {
    return {
      Firefox: ["firefox", "firefox-bin"],
      Chrome: [
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
      ],
      Safari: [], // Not available on Linux
    };
  }

  /**
   * Launch a browser on Linux using direct executable calls or xdg-open fallback
   * @param browserName - The name of the browser to launch
   * @returns Promise that resolves when the browser is launched
   * @throws {Error} When the browser is not available or fails to launch
   */
  public async launchBrowser(browserName: BrowserName): Promise<void> {
    const executables = this.getBrowserExecutables(browserName);

    if (executables.length === 0) {
      throw new Error(`${browserName} not available on Linux`);
    }

    // Try each possible command
    if (await this.tryLaunchExecutables(executables)) {
      return; // Success
    }

    // Fallback to xdg-open if no browser executable worked
    await this.tryXdgOpenFallback(browserName);
  }

  /**
   * Try to launch browser executables
   * @param executables - Array of executable names to try
   * @returns Promise that resolves to true if any executable was successful
   */
  private async tryLaunchExecutables(executables: string[]): Promise<boolean> {
    for (const cmd of executables) {
      try {
        // Use direct execution without shell to avoid injection
        await execFileAsync(cmd, [], {
          timeout: 5000,
        });
        return true; // Success
      } catch {}
    }
    return false;
  }

  /**
   * Try xdg-open as fallback when direct executables fail
   * @param browserName - The name of the browser that failed to launch
   * @returns Promise that resolves when xdg-open succeeds
   * @throws {Error} When xdg-open also fails
   */
  private async tryXdgOpenFallback(browserName: BrowserName): Promise<void> {
    try {
      await execFileAsync("xdg-open", ["http://localhost"], {
        timeout: 5000,
      });
    } catch (error: unknown) {
      throw new Error(
        `Failed to launch ${browserName} on Linux: ${BasePlatformBrowserControl.getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Get the platform name for Linux
   * @returns The platform name "Linux"
   */
  public getPlatformName(): string {
    return "Linux";
  }
}

/**
 * Factory to create platform-specific browser control
 * Following SOLID - Single Responsibility and Open/Closed principles
 */
let platformControlInstance: PlatformBrowserControl | null = null;

/**
 * Creates platform-specific browser control instance
 * @param platformOverride - Optional platform override for testing
 * @returns Platform-specific browser control instance
 * @throws {Error} When platform is not supported
 */
export function createPlatformBrowserControl(
  platformOverride?: Platform | NodeJS.Platform,
): PlatformBrowserControl {
  // Use singleton for efficiency when not overriding
  if (platformControlInstance !== null && platformOverride === undefined) {
    return platformControlInstance;
  }

  const currentPlatform = platformOverride ?? getPlatform();
  const control = createControlForPlatform(currentPlatform);

  if (platformOverride === undefined) {
    platformControlInstance = control;
  }

  return control;
}

/**
 * Creates the appropriate control instance for the given platform
 * @param platform - The platform to create control for
 * @returns Platform-specific browser control instance
 * @throws {Error} When platform is not supported
 */
function createControlForPlatform(platform: string): PlatformBrowserControl {
  switch (platform) {
    case "darwin":
      return new MacOSBrowserControl();
    case "win32":
      return new WindowsBrowserControl();
    case "linux":
    case "freebsd":
    case "openbsd":
      return new LinuxBrowserControl();
    default:
      // For any other platform string, try Linux as fallback
      return new LinuxBrowserControl();
  }
}

/**
 * Clear the singleton instance (useful for testing)
 */
export function clearPlatformControlInstance(): void {
  platformControlInstance = null;
}
