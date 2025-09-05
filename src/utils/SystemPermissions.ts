import { exec } from "node:child_process";
import readline from "node:readline";
import { promisify } from "node:util";
import { errorMessageContains, getErrorMessage } from "./errorUtils";
import { createTaggedLogger } from "./logHelpers";
import { isMacOS } from "./platformUtils";

const execAsync = promisify(exec);
const logger = createTaggedLogger("SystemPermissions");

export interface PermissionRequestOptions {
  appName: string;
  browserName: string;
  interactive?: boolean;
}

/**
 * Open System Settings to the Full Disk Access page on macOS
 */
async function openFullDiskAccessSettings(): Promise<void> {
  try {
    // Open System Settings directly to Privacy & Security > Full Disk Access
    await execAsync(
      'open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"',
    );
    logger.info(
      "Opened System Settings > Privacy & Security > Full Disk Access",
    );
  } catch (_error) {
    // Fallback to general Privacy & Security
    try {
      await execAsync(
        'open "x-apple.systempreferences:com.apple.preference.security?Privacy"',
      );
      logger.info("Opened System Settings > Privacy & Security");
    } catch (_fallbackError) {
      // Last resort: just open System Settings
      await execAsync("open -b com.apple.systempreferences");
      logger.info("Opened System Settings");
    }
  }
}

/**
 * Check which terminal application is running
 */
function getTerminalApp(): string {
  const termProgram = process.env.TERM_PROGRAM;

  if (termProgram === "iTerm.app") {
    return "iTerm";
  }
  if (termProgram === "Apple_Terminal") {
    return "Terminal";
  }
  if (termProgram === "vscode") {
    return "Visual Studio Code";
  }
  return termProgram || "your terminal application";
}

/**
 * Prompt user to grant permissions
 */
async function promptForPermissionGrant(
  appName: string,
  browserName: string,
): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log(`
⚠️  ${browserName} cookie access is blocked by macOS security.

To grant access, ${appName} needs permission to read ${browserName} data.

Would you like to:
1. Open System Settings to grant permission (recommended)
2. Skip ${browserName} cookies for now
3. Exit

Please enter your choice (1/2/3): `);

    rl.question("", (answer) => {
      rl.close();
      resolve(answer.trim() === "1");
    });
  });
}

/**
 * Handle Safari permission errors with user guidance
 */
export async function handleSafariPermissionError(
  error: Error,
  options: PermissionRequestOptions,
): Promise<boolean> {
  if (!isMacOS()) {
    return false;
  }

  const isPermissionError =
    errorMessageContains(error, "eperm") ||
    errorMessageContains(error, "operation not permitted") ||
    errorMessageContains(error, "permission denied") ||
    errorMessageContains(error, "authorization denied");

  if (!isPermissionError) {
    return false;
  }

  const terminalApp = options.appName || getTerminalApp();

  logger.warn(`${options.browserName} cookie access denied by macOS`, {
    app: terminalApp,
    error: getErrorMessage(error),
  });

  if (options.interactive !== false) {
    const shouldOpenSettings = await promptForPermissionGrant(
      terminalApp,
      options.browserName,
    );

    if (shouldOpenSettings) {
      await openFullDiskAccessSettings();

      console.log(`
✅ System Settings opened to Privacy & Security

Please follow these steps:
1. Look for "${terminalApp}" in the list
2. If not present, click the "+" button and add it
3. Enable the toggle next to "${terminalApp}"
4. You may need to restart ${terminalApp} after granting permission
5. Then run this command again

Press Enter when you've completed these steps...`);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      await new Promise<void>((resolve) => {
        rl.question("", () => {
          rl.close();
          resolve();
        });
      });

      return true;
    }
  } else {
    logger.info(
      `To grant ${options.browserName} access, add ${terminalApp} to System Settings > Privacy & Security > Full Disk Access`,
    );
  }

  return false;
}

/**
 * Check if we have permission to access a file
 */
export async function checkFilePermission(filePath: string): Promise<boolean> {
  try {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    // Try to read the file
    await execAsync(`cat "${filePath}" > /dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}
