import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { BrowserName } from "@utils/BrowserControl";
import { type Platform, getPlatform, isWindows } from "@utils/platformUtils";

const execFileAsync = promisify(execFile);

/**
 * Interface for platform-specific browser control operations
 * Following SOLID principles - Interface Segregation
 */
export interface PlatformBrowserControl {
  /**
   * Check if the browser is supported on this platform
   */
  isBrowserSupported(browserName: BrowserName): boolean;

  /**
   * Get executable names for a browser on this platform
   */
  getBrowserExecutables(browserName: BrowserName): string[];

  /**
   * Launch a browser on this platform
   */
  launchBrowser(browserName: BrowserName): Promise<void>;

  /**
   * Get the platform name
   */
  getPlatformName(): string;

  /**
   * Check if a browser is installed
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
  protected readonly browserExecutables: Record<BrowserName, string[]>;

  constructor() {
    this.browserExecutables = this.initializeBrowserExecutables();
  }

  /**
   * Initialize browser executables for this platform
   */
  protected abstract initializeBrowserExecutables(): Record<
    BrowserName,
    string[]
  >;

  public isBrowserSupported(browserName: BrowserName): boolean {
    const executables = this.browserExecutables[browserName];
    return executables && executables.length > 0;
  }

  public getBrowserExecutables(browserName: BrowserName): string[] {
    return this.browserExecutables[browserName] || [];
  }

  public abstract launchBrowser(browserName: BrowserName): Promise<void>;

  public abstract getPlatformName(): string;

  /**
   * Default implementation to check if browser is installed
   * Can be overridden by platform-specific implementations
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
    } catch (error) {
      // Log but don't throw - browser may still launch
      if (error && typeof error === "object" && "code" in error) {
        // Ignore expected errors like ENOENT when browser isn't installed
        if (error.code !== "ENOENT") {
          console.debug(`Browser launch warning: ${String(error)}`);
        }
      }
    }
  }
}

/**
 * macOS implementation
 */
export class MacOSBrowserControl extends BasePlatformBrowserControl {
  protected initializeBrowserExecutables(): Record<BrowserName, string[]> {
    return {
      Firefox: ["Firefox"],
      Chrome: ["Google Chrome"],
      Safari: ["Safari"],
    };
  }

  public async launchBrowser(browserName: BrowserName): Promise<void> {
    const appNames: Record<BrowserName, string> = {
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

  public getPlatformName(): string {
    return "macOS";
  }
}

/**
 * Windows implementation
 */
export class WindowsBrowserControl extends BasePlatformBrowserControl {
  protected initializeBrowserExecutables(): Record<BrowserName, string[]> {
    return {
      Firefox: ["firefox.exe", "Firefox"],
      Chrome: ["chrome.exe", "Google Chrome"],
      Safari: [], // Not available on Windows
    };
  }

  public async launchBrowser(browserName: BrowserName): Promise<void> {
    const executables = this.getBrowserExecutables(browserName);

    if (executables.length === 0) {
      throw new Error(`${browserName} not available on Windows`);
    }

    // Try each executable until one works
    for (const exe of executables) {
      try {
        // Use cmd.exe with /c flag to run start command safely
        await execFileAsync("cmd.exe", ["/c", "start", "", exe], {
          timeout: 5000,
          windowsHide: true,
        });
        return; // Success, exit early
      } catch {
        // Try next executable
      }
    }

    throw new Error(`Failed to launch ${browserName} on Windows`);
  }

  public getPlatformName(): string {
    return "Windows";
  }
}

/**
 * Linux implementation
 */
export class LinuxBrowserControl extends BasePlatformBrowserControl {
  protected initializeBrowserExecutables(): Record<BrowserName, string[]> {
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

  public async launchBrowser(browserName: BrowserName): Promise<void> {
    const executables = this.getBrowserExecutables(browserName);

    if (executables.length === 0) {
      throw new Error(`${browserName} not available on Linux`);
    }

    // Try each possible command
    for (const cmd of executables) {
      try {
        // Use direct execution without shell to avoid injection
        await execFileAsync(cmd, [], {
          timeout: 5000,
        });
        return; // Success, exit early
      } catch {
        // Try next command
      }
    }

    // Fallback to xdg-open if no browser executable worked
    try {
      await execFileAsync("xdg-open", ["http://localhost"], {
        timeout: 5000,
      });
    } catch (error) {
      throw new Error(
        `Failed to launch ${browserName} on Linux: ${String(error)}`,
      );
    }
  }

  public getPlatformName(): string {
    return "Linux";
  }
}

/**
 * Factory to create platform-specific browser control
 * Following SOLID - Single Responsibility and Open/Closed principles
 */
let platformControlInstance: PlatformBrowserControl | null = null;

export function createPlatformBrowserControl(
  platformOverride?: Platform | NodeJS.Platform,
): PlatformBrowserControl {
  // Use singleton for efficiency when not overriding
  if (platformControlInstance && !platformOverride) {
    return platformControlInstance;
  }

  const currentPlatform = platformOverride || getPlatform();

  let control: PlatformBrowserControl;

  switch (currentPlatform) {
    case "darwin":
      control = new MacOSBrowserControl();
      break;
    case "win32":
      control = new WindowsBrowserControl();
      break;
    case "linux":
    case "freebsd":
    case "openbsd":
      control = new LinuxBrowserControl();
      break;
    case "unknown":
      throw new Error("Platform not supported for browser control");
    default:
      // For any other platform string, try Linux as fallback
      control = new LinuxBrowserControl();
  }

  if (!platformOverride) {
    platformControlInstance = control;
  }

  return control;
}

/**
 * Clear the singleton instance (useful for testing)
 */
export function clearPlatformControlInstance(): void {
  platformControlInstance = null;
}
