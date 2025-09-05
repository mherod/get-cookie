import {
  type BrowserName,
  closeBrowserGracefully,
  waitForBrowserToClose,
} from "@utils/BrowserControl";
import { detectFileHandles, getFileLockInfo } from "@utils/FileHandleDetector";
import { getBrowserConflictAdvice } from "@utils/ProcessDetector";
import type { createTaggedLogger } from "@utils/logHelpers";

export interface BrowserLockResult {
  resolved: boolean;
  shouldRelaunch: boolean;
}

/**
 * Shared handler for browser lock/permission issues
 * Follows DRY principle to avoid duplicating logic across browser strategies
 */
export class BrowserLockHandler {
  constructor(
    private logger: ReturnType<typeof createTaggedLogger>,
    private browserName: BrowserName,
  ) {}

  /**
   * Handle database lock or permission errors
   * @param error - The error to check
   * @param file - The file that was locked/inaccessible
   * @param processes - Running processes for this browser
   * @param autoClose - Whether to attempt auto-closing the browser
   * @returns Promise that resolves to lock result
   */
  async handleBrowserConflict(
    error: unknown,
    file: string,
    processes: Array<{ pid: number; command: string }>,
    autoClose = false,
  ): Promise<BrowserLockResult> {
    if (!(error instanceof Error)) {
      return { resolved: false, shouldRelaunch: false };
    }

    const errorMessage = error.message.toLowerCase();
    const isLockError =
      errorMessage.includes("database is locked") ||
      errorMessage.includes("database locked") ||
      errorMessage.includes("sqlite_busy") ||
      errorMessage.includes("eperm") ||
      errorMessage.includes("operation not permitted") ||
      errorMessage.includes("permission denied");

    if (!isLockError) {
      return { resolved: false, shouldRelaunch: false };
    }

    // Check for file handles to get more detailed lock information
    try {
      const fileHandles = await detectFileHandles(file);

      if (fileHandles.length > 0) {
        const lockInfo = await getFileLockInfo(file);

        // Log at warn level so it's visible to users
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

        // If we detect file handles but no browser processes, it might be a different issue
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

    try {
      if (processes.length > 0) {
        const advice = getBrowserConflictAdvice(
          this.browserName.toLowerCase(),
          processes,
        );

        this.logger.warn(`${this.browserName} process conflict detected`, {
          file,
          processCount: processes.length,
          advice,
        });

        // If auto-close is enabled, try to close browser gracefully
        if (autoClose) {
          this.logger.info(
            `Attempting to close ${this.browserName} gracefully...`,
          );
          const closed = await closeBrowserGracefully(this.browserName, {
            interactive: true,
            force: false,
          });

          if (closed) {
            // Wait for browser to fully close
            await waitForBrowserToClose(this.browserName, 5000);
            return { resolved: true, shouldRelaunch: true };
          }
        }
      } else {
        this.logger.warn(
          "Database/file locked but no browser processes detected",
          {
            file,
            browserName: this.browserName,
            suggestion: "Another process may be accessing the file",
          },
        );
      }
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
   * Relaunch browser after successful operation
   * @returns Promise that resolves when browser is relaunched
   */
  async relaunchBrowser(): Promise<void> {
    this.logger.info(`Relaunching ${this.browserName}...`);

    try {
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      // Map browser names to their app names
      const appNames: Record<BrowserName, string> = {
        Firefox: "Firefox",
        Chrome: "Google Chrome",
        Safari: "Safari",
      };

      const appName = appNames[this.browserName];
      await execAsync(
        `osascript -e 'tell application "${appName}" to activate'`,
      );

      this.logger.success(
        `${this.browserName} has been relaunched with your tabs restored`,
      );
    } catch (relaunchError) {
      this.logger.warn(`Could not relaunch ${this.browserName} automatically`, {
        error:
          relaunchError instanceof Error
            ? relaunchError.message
            : String(relaunchError),
      });
    }
  }
}
