import {
  type BrowserName,
  closeBrowserGracefully,
  waitForBrowserToClose,
} from "@utils/BrowserControl";
import { detectFileHandles, getFileLockInfo } from "@utils/FileHandleDetector";
import { getBrowserConflictAdvice } from "@utils/ProcessDetector";
import { getDatabaseErrorType, getErrorMessage } from "@utils/errorUtils";
import type { createTaggedLogger } from "@utils/logHelpers";
import {
  type PlatformBrowserControl,
  createPlatformBrowserControl,
} from "./platform/PlatformBrowserControl";

/**
 * Result of a browser conflict handling operation
 */
export interface BrowserLockResult {
  /** Whether the conflict was resolved */
  resolved: boolean;
  /** Whether the browser should be relaunched */
  shouldRelaunch: boolean;
}

/**
 * Shared handler for browser lock/permission issues
 * Follows DRY principle to avoid duplicating logic across browser strategies
 * Uses Strategy pattern for platform-specific operations
 */
export class BrowserLockHandler {
  private readonly platformControl: PlatformBrowserControl;

  /**
   * Creates a new BrowserLockHandler instance
   * @param logger - Tagged logger instance for this handler
   * @param browserName - Name of the browser this handler manages
   * @param platformControl - Optional platform control strategy (for testing)
   */
  public constructor(
    private logger: ReturnType<typeof createTaggedLogger>,
    private browserName: BrowserName,
    platformControl?: PlatformBrowserControl,
  ) {
    // Use provided control or create platform-specific one
    this.platformControl = platformControl || createPlatformBrowserControl();
  }

  /**
   * Handle database lock or permission errors
   * @param error - The error to check
   * @param file - The file that was locked/inaccessible
   * @param processes - Running processes for this browser
   * @param autoClose - Whether to attempt auto-closing the browser
   * @returns Promise that resolves to lock result
   */
  public async handleBrowserConflict(
    error: unknown,
    file: string,
    processes: Array<{ pid: number; command: string }>,
    autoClose = false,
  ): Promise<BrowserLockResult> {
    if (!(error instanceof Error)) {
      return { resolved: false, shouldRelaunch: false };
    }

    if (!this.isLockError(error)) {
      return { resolved: false, shouldRelaunch: false };
    }

    await this.logFileHandleInfo(file, processes);
    return this.handleProcessConflict(file, processes, autoClose);
  }

  /**
   * Check if an error indicates a database lock or permission issue
   * @param error - The error to check
   * @returns True if this is a lock-related error
   */
  private isLockError(error: Error): boolean {
    const dbErrorType = getDatabaseErrorType(error);
    return dbErrorType === "locked" || dbErrorType === "permission";
  }

  /**
   * Log detailed file handle information
   * @param file - The file that was locked
   * @param processes - Browser processes detected
   */
  private async logFileHandleInfo(
    file: string,
    processes: Array<{ pid: number; command: string }>,
  ): Promise<void> {
    try {
      const fileHandles = await detectFileHandles(file);

      if (fileHandles.length > 0) {
        const lockInfo = await getFileLockInfo(file);

        this.logger.warn("Database locked by specific processes", {
          file,
          lockInfo,
          handleCount: fileHandles.length,
          handles: fileHandles.map((h) => ({
            pid: h.pid,
            command: h.command,
            mode: h.mode,
            user: h.user,
          })),
        });

        if (processes.length === 0) {
          this.logger.info(
            "File is locked but no browser processes detected - another tool may be accessing the database",
            {
              lockingProcesses: fileHandles
                .map((h) => `${h.command} (PID: ${h.pid})`)
                .join(", "),
            },
          );
        }
      }
    } catch (handleError) {
      this.logger.debug("Could not detect file handles", {
        error:
          handleError instanceof Error
            ? handleError.message
            : String(handleError),
      });
    }
  }

  /**
   * Handle process conflicts and optionally close the browser
   * @param file - The file that was locked
   * @param processes - Browser processes detected
   * @param autoClose - Whether to attempt auto-closing
   * @returns Promise that resolves to lock result
   */
  private async handleProcessConflict(
    file: string,
    processes: Array<{ pid: number; command: string }>,
    autoClose: boolean,
  ): Promise<BrowserLockResult> {
    try {
      if (processes.length > 0) {
        return await this.handleBrowserProcesses(file, processes, autoClose);
      }

      this.logger.warn(
        "Database/file locked but no browser processes detected",
        {
          file,
          browserName: this.browserName,
          suggestion: "Another process may be accessing the file",
        },
      );
    } catch (processError) {
      this.logger.debug("Failed to check browser processes", {
        error:
          processError instanceof Error
            ? processError.message
            : String(processError),
      });
    }

    return { resolved: false, shouldRelaunch: false };
  }

  /**
   * Handle detected browser processes
   * @param file - The file that was locked
   * @param processes - Browser processes detected
   * @param autoClose - Whether to attempt auto-closing
   * @returns Promise that resolves to lock result
   */
  private async handleBrowserProcesses(
    file: string,
    processes: Array<{ pid: number; command: string }>,
    autoClose: boolean,
  ): Promise<BrowserLockResult> {
    const processesWithDetails = processes.map((p) => ({
      ...p,
      details: `PID: ${p.pid}, Command: ${p.command}`,
    }));

    const advice = getBrowserConflictAdvice(
      this.browserName.toLowerCase(),
      processesWithDetails,
    );

    this.logger.warn(`${this.browserName} process conflict detected`, {
      file,
      processCount: processes.length,
      advice,
    });

    if (autoClose) {
      return this.attemptBrowserClose();
    }

    return Promise.resolve({ resolved: false, shouldRelaunch: false });
  }

  /**
   * Attempt to close the browser gracefully
   * @returns Promise that resolves to lock result
   */
  private async attemptBrowserClose(): Promise<BrowserLockResult> {
    this.logger.info(`Attempting to close ${this.browserName} gracefully...`);

    const closed = await closeBrowserGracefully(this.browserName, {
      interactive: true,
      force: false,
    });

    if (closed) {
      await waitForBrowserToClose(this.browserName, 5000);
      return { resolved: true, shouldRelaunch: true };
    }

    return { resolved: false, shouldRelaunch: false };
  }

  /**
   * Relaunch browser after successful operation
   * @returns Promise that resolves when browser is relaunched
   */
  public async relaunchBrowser(): Promise<void> {
    this.logger.info(`Relaunching ${this.browserName}...`);

    try {
      // Check if browser is supported on this platform
      if (!this.platformControl.isBrowserSupported(this.browserName)) {
        this.logger.warn(
          `${this.browserName} is not available on ${this.platformControl.getPlatformName()}`,
        );
        return;
      }

      // Use platform-specific strategy to launch browser
      await this.platformControl.launchBrowser(this.browserName);

      this.logger.success(
        `${this.browserName} has been relaunched with your tabs restored`,
      );
    } catch (relaunchError) {
      this.logger.warn(`Could not relaunch ${this.browserName} automatically`, {
        error: getErrorMessage(relaunchError),
        platform: this.platformControl.getPlatformName(),
      });
    }
  }
}
