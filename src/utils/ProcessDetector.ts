import { execSimple } from "./execSimple";
import { createTaggedLogger } from "./logHelpers";

const logger = createTaggedLogger("ProcessDetector");

/**
 * Parse a process line from ps output
 * @param line - The process line from ps output
 * @param defaultCommand - Default command name if parsing fails
 * @returns ProcessInfo if valid, null otherwise
 */
function parseProcessLine(
  line: string,
  defaultCommand: string,
): ProcessInfo | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) {
    return null;
  }

  const pid = parseInt(parts[1], 10);
  if (isNaN(pid)) {
    return null;
  }

  return {
    pid,
    command: parts.slice(10).join(" ") || defaultCommand,
    details: line.trim(),
  };
}

/**
 * Information about a detected process
 */
export interface ProcessInfo {
  /** Process ID */
  pid: number;
  /** Process name/command */
  command: string;
  /** Full process details */
  details: string;
}

/**
 * Check if Firefox browser is currently running
 * @returns Promise that resolves to array of Firefox process information
 * @example
 * ```typescript
 * const firefoxProcesses = await isFirefoxRunning();
 * if (firefoxProcesses.length > 0) {
 *   console.log('Firefox is running, consider closing it for reliable cookie access');
 * }
 * ```
 */
export async function isFirefoxRunning(): Promise<ProcessInfo[]> {
  try {
    // Use ps command to find Firefox processes
    // Look for common Firefox process names across platforms
    const command = "ps aux | grep -i firefox | grep -v grep";
    const { stdout } = await execSimple(command);

    if (!stdout || stdout.trim() === "") {
      return [];
    }

    const processes: ProcessInfo[] = [];
    const lines = stdout.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      const processInfo = parseProcessLine(line, "firefox");
      if (processInfo) {
        processes.push(processInfo);
      }
    }

    logger.debug("Firefox process detection completed", {
      processCount: processes.length,
      processes: processes.map((p) => ({ pid: p.pid, command: p.command })),
    });

    return processes;
  } catch (error) {
    logger.warn("Failed to detect Firefox processes", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Check if Chrome browser is currently running
 * @returns Promise that resolves to array of Chrome process information
 */
export async function isChromeRunning(): Promise<ProcessInfo[]> {
  try {
    // Look for Chrome processes
    const command =
      "ps aux | grep -i 'google chrome\\|chromium' | grep -v grep";
    const { stdout } = await execSimple(command);

    if (!stdout || stdout.trim() === "") {
      return [];
    }

    const processes: ProcessInfo[] = [];
    const lines = stdout.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      const processInfo = parseProcessLine(line, "chrome");
      if (processInfo) {
        processes.push(processInfo);
      }
    }

    logger.debug("Chrome process detection completed", {
      processCount: processes.length,
    });

    return processes;
  } catch (error) {
    logger.warn("Failed to detect Chrome processes", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get user-friendly advice for browser conflicts
 * @param browserName - Name of the browser
 * @param processes - Array of detected processes
 * @returns User-friendly message with advice
 */
export function getBrowserConflictAdvice(
  browserName: string,
  processes: ProcessInfo[],
): string {
  if (processes.length === 0) {
    return "";
  }

  const processCount = processes.length;
  const browserDisplayName =
    browserName.charAt(0).toUpperCase() + browserName.slice(1);

  return (
    `${browserDisplayName} is currently running (${processCount} process${processCount > 1 ? "es" : ""} detected). ` +
    `For reliable cookie access, consider closing ${browserDisplayName} and trying again. ` +
    `Alternatively, use the --force flag to attempt access despite the lock.`
  );
}
