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

  const pid = Number.parseInt(parts[1], 10);
  if (Number.isNaN(pid)) {
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
 * Generic browser process detection
 * @param browserName - Name of the browser to detect
 * @param grepPattern - Pattern to grep for in ps output
 * @returns Promise that resolves to array of process information
 */
async function detectBrowserProcesses(
  browserName: string,
  grepPattern: string,
): Promise<ProcessInfo[]> {
  try {
    const command = `ps aux | grep -i '${grepPattern}' | grep -v grep`;
    const { stdout } = await execSimple(command);

    if (!stdout || stdout.trim() === "") {
      return [];
    }

    const processes: ProcessInfo[] = [];
    const lines = stdout.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      const processInfo = parseProcessLine(line, browserName.toLowerCase());
      if (processInfo) {
        processes.push(processInfo);
      }
    }

    logger.debug(`${browserName} process detection completed`, {
      processCount: processes.length,
      processes: processes.map((p) => ({ pid: p.pid, command: p.command })),
    });

    return processes;
  } catch (error) {
    logger.warn(`Failed to detect ${browserName} processes`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
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
  return await detectBrowserProcesses("Firefox", "firefox");
}

/**
 * Check if Chrome browser is currently running
 * @returns Promise that resolves to array of Chrome process information
 */
export async function isChromeRunning(): Promise<ProcessInfo[]> {
  return await detectBrowserProcesses("Chrome", "google chrome\\|chromium");
}

/**
 * Check if Safari browser is currently running
 * @returns Promise that resolves to array of Safari process information
 */
export async function isSafariRunning(): Promise<ProcessInfo[]> {
  return await detectBrowserProcesses(
    "Safari",
    "/Applications/Safari.app/Contents/MacOS/Safari",
  );
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

  return `${browserDisplayName} is currently running (${processCount} process${processCount > 1 ? "es" : ""} detected). For reliable cookie access, consider closing ${browserDisplayName} and trying again. Alternatively, use the --force flag to attempt access despite the lock.`;
}
