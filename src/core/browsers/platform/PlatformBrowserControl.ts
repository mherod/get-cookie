import { platform as osPlatform } from "node:os";
import type { BrowserName } from "@utils/BrowserControl";

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
   * Execute command helper
   */
  protected async executeCommand(command: string): Promise<void> {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    await execAsync(command);
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

    await this.executeCommand(
      `osascript -e 'tell application "${appName}" to activate'`,
    );
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

    // Try to launch via start command
    await this.executeCommand(`start "" "${executables[0]}"`);
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
    let launched = false;
    for (const cmd of executables) {
      try {
        await this.executeCommand(`nohup ${cmd} > /dev/null 2>&1 &`);
        launched = true;
        break;
      } catch {
        // Try next command
      }
    }

    if (!launched) {
      // Fallback to xdg-open
      await this.executeCommand(
        `xdg-open "http://localhost" > /dev/null 2>&1 &`,
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
  platformOverride?: NodeJS.Platform,
): PlatformBrowserControl {
  // Use singleton for efficiency when not overriding
  if (platformControlInstance && !platformOverride) {
    return platformControlInstance;
  }

  const currentPlatform = platformOverride || osPlatform();

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
    default:
      throw new Error(`Unsupported platform: ${currentPlatform}`);
  }

  if (!platformOverride) {
    platformControlInstance = control;
  }

  return control;
}
