import { exec } from "node:child_process";
import readline from "node:readline";
import { promisify } from "node:util";

import type { BrowserName } from "../types/schemas";
import { createTaggedLogger } from "./logHelpers";
import { isMacOS } from "./platformUtils";

// Re-export BrowserName from schemas for backward compatibility
export type { BrowserName } from "../types/schemas";

const execAsync = promisify(exec);
const logger = createTaggedLogger("BrowserControl");

/**
 * Check if the current environment supports interactive prompts
 * @returns True if environment can handle interactive prompts
 */
function isInteractiveEnvironment(): boolean {
  const isCI = process.env.CI === "true" || process.env.CI === "1";
  const isTest =
    process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;
  const hasTTY = process.stdin.isTTY && process.stdout.isTTY;

  return hasTTY && !isCI && !isTest;
}

/**
 *
 */
export interface BrowserControlOptions {
  force?: boolean;
  interactive?: boolean;
}

/**
 * Map of browser names to their macOS application names
 * Only includes browsers that can be controlled on macOS
 */
const BROWSER_APP_NAMES: Partial<Record<BrowserName, string>> = {
  Firefox: "Firefox",
  Chrome: "Google Chrome",
  Safari: "Safari",
};

/**
 * Check if a browser is running on macOS
 * @param browserName - Name of the browser to check
 * @returns Promise that resolves to true if browser is running
 */
async function isBrowserRunningMacOS(
  browserName: BrowserName,
): Promise<boolean> {
  try {
    const appName = BROWSER_APP_NAMES[browserName];
    if (!appName) {
      logger.debug("Browser not supported for macOS control", { browserName });
      return false;
    }
    const script = `tell application "System Events" to (name of processes) contains "${appName}"`;
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    return stdout.trim() === "true";
  } catch (error) {
    logger.debug("Failed to check if browser is running", {
      browserName,
      error,
    });
    return false;
  }
}

/**
 * Gracefully quit a browser on macOS
 * @param browserName - Name of the browser to quit
 * @returns Promise that resolves to true if browser was quit successfully
 */
async function quitBrowserMacOS(browserName: BrowserName): Promise<boolean> {
  try {
    const appName = BROWSER_APP_NAMES[browserName];
    if (!appName) {
      logger.debug("Browser not supported for macOS control", { browserName });
      return false;
    }

    // First, try to quit gracefully
    const quitScript = `tell application "${appName}" to quit`;
    await execAsync(`osascript -e '${quitScript}'`);

    // Wait a moment for the browser to quit
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if it's still running
    const stillRunning = await isBrowserRunningMacOS(browserName);
    if (!stillRunning) {
      logger.info("Browser quit successfully", { browserName });
      return true;
    }

    logger.warn("Browser did not quit gracefully", { browserName });
    return false;
  } catch (error) {
    logger.error("Failed to quit browser", { browserName, error });
    return false;
  }
}

/**
 * Save open tabs in browser before closing (macOS only)
 * This will attempt to save the session so tabs can be restored
 * @param browserName - Name of the browser
 * @returns Promise that resolves when tabs are saved
 */
async function saveBrowserSessionMacOS(
  browserName: BrowserName,
): Promise<void> {
  try {
    const appName = BROWSER_APP_NAMES[browserName];
    if (!appName) {
      logger.debug("Browser not supported for macOS control", { browserName });
      return;
    }

    if (browserName === "Firefox") {
      // Firefox: Use keyboard shortcut to save session (Cmd+Shift+D to bookmark all tabs)
      const script = `
        tell application "${appName}"
          activate
        end tell
        tell application "System Events"
          keystroke "d" using {command down, shift down}
          delay 0.5
          key code 36
        end tell
      `;
      await execAsync(`osascript -e '${script}'`);
      logger.debug("Attempted to save Firefox session", { browserName });
    } else if (browserName === "Chrome") {
      // Chrome will restore tabs automatically if quit gracefully
      logger.debug("Chrome will restore tabs automatically", { browserName });
    } else {
      // Safari will restore tabs if quit gracefully
      logger.debug("Safari will restore tabs automatically", { browserName });
    }
  } catch (error) {
    logger.debug("Failed to save browser session", { browserName, error });
  }
}

/**
 * Prompt user for confirmation before closing browser
 * @param browserName - Name of the browser
 * @returns Promise that resolves to true if user confirms
 */
async function promptUserConfirmation(
  browserName: BrowserName,
): Promise<boolean> {
  // Check if we're in a TTY-capable environment
  if (!isInteractiveEnvironment()) {
    logger.debug("Non-interactive environment detected, skipping prompt", {
      browserName,
      CI: process.env.CI,
      NODE_ENV: process.env.NODE_ENV,
      JEST_WORKER_ID: process.env.JEST_WORKER_ID,
      stdin_tty: process.stdin.isTTY,
      stdout_tty: process.stdout.isTTY,
    });
    return false;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `\n⚠️  ${browserName} is currently running and blocking cookie access.\n` +
        `Would you like to close ${browserName}? Your tabs will be restored when you reopen it. (y/N): `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
      },
    );
  });
}

/**
 * Relaunch a browser after it has been closed
 * @param browserName - Name of the browser to relaunch
 * @returns Promise that resolves to true if browser was relaunched
 */
async function relaunchBrowserMacOS(
  browserName: BrowserName,
): Promise<boolean> {
  try {
    const appName = BROWSER_APP_NAMES[browserName];

    // Launch the browser
    const launchScript = `tell application "${appName}" to activate`;
    await execAsync(`osascript -e '${launchScript}'`);

    // Give it a moment to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if it's running
    const isRunning = await isBrowserRunningMacOS(browserName);
    if (isRunning) {
      logger.info("Browser relaunched successfully", { browserName });
      return true;
    }

    logger.warn("Browser did not relaunch", { browserName });
    return false;
  } catch (error) {
    logger.error("Failed to relaunch browser", { browserName, error });
    return false;
  }
}

/**
 * Attempt to close a browser gracefully
 * @param browserName - Name of the browser to close
 * @param options - Control options
 * @returns Promise that resolves to true if browser was closed
 */
export async function closeBrowserGracefully(
  browserName: BrowserName,
  options: BrowserControlOptions = {},
): Promise<boolean> {
  if (!isMacOS()) {
    logger.debug("Browser control only supported on macOS");
    return false;
  }

  try {
    // Check if browser is running
    const isRunning = await isBrowserRunningMacOS(browserName);
    if (!isRunning) {
      logger.debug("Browser is not running", { browserName });
      return true;
    }

    // If interactive mode, prompt user
    if (options.interactive === true && options.force !== true) {
      const confirmed = await promptUserConfirmation(browserName);
      if (!confirmed) {
        logger.info("User cancelled browser close", { browserName });
        return false;
      }
    }

    // Try to save session first (for browsers that support it)
    await saveBrowserSessionMacOS(browserName);

    // Quit the browser
    const success = await quitBrowserMacOS(browserName);

    if (success) {
      logger.success(
        `${browserName} closed successfully. Tabs will be restored on next launch.`,
      );
    } else {
      logger.warn(
        `Failed to close ${browserName}. You may need to close it manually.`,
      );
    }

    return success;
  } catch (error) {
    logger.error("Failed to control browser", { browserName, error });
    return false;
  }
}

/**
 * Close browser, perform an action, then relaunch the browser
 * @param browserName - Name of the browser
 * @param action - Action to perform while browser is closed
 * @param options - Control options
 * @returns Promise that resolves to the result of the action
 */
export async function closeBrowserForAction<T>(
  browserName: BrowserName,
  action: () => Promise<T>,
  options: BrowserControlOptions = {},
): Promise<T | null> {
  if (!isMacOS()) {
    logger.debug("Browser control only supported on macOS");
    return null;
  }

  let browserWasClosed = false;

  try {
    // Check if browser is running
    const wasRunning = await isBrowserRunningMacOS(browserName);

    if (wasRunning) {
      // Close the browser
      browserWasClosed = await closeBrowserGracefully(browserName, options);

      if (!browserWasClosed) {
        logger.warn("Failed to close browser, attempting action anyway");
      } else {
        // Wait for browser to fully close
        await waitForBrowserToClose(browserName, 5000);
      }
    }

    // Perform the action
    const result = await action();

    // Relaunch browser if we closed it
    if (wasRunning && browserWasClosed) {
      logger.info(`Relaunching ${browserName}...`);
      const relaunched = await relaunchBrowserMacOS(browserName);

      if (relaunched) {
        logger.success(
          `${browserName} has been relaunched with your tabs restored`,
        );
      } else {
        logger.warn(
          `Could not relaunch ${browserName} automatically. Please reopen it manually.`,
        );
      }
    }

    return result;
  } catch (error) {
    logger.error("Failed during browser action", { browserName, error });

    // Try to relaunch browser if we closed it
    if (browserWasClosed) {
      await relaunchBrowserMacOS(browserName);
    }

    return null;
  }
}

/**
 * Wait for a browser to close
 * @param browserName - Name of the browser
 * @param maxWaitMs - Maximum time to wait in milliseconds
 * @returns Promise that resolves to true if browser closed within timeout
 */
export async function waitForBrowserToClose(
  browserName: BrowserName,
  maxWaitMs = 10000,
): Promise<boolean> {
  if (!isMacOS()) {
    return false;
  }

  const startTime = Date.now();
  const checkInterval = 500;

  while (Date.now() - startTime < maxWaitMs) {
    const isRunning = await isBrowserRunningMacOS(browserName);
    if (!isRunning) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  return false;
}
