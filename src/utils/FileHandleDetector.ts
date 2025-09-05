import { platform } from "node:os";
import { execSimple } from "./execSimple";
import { createTaggedLogger } from "./logHelpers";

const logger = createTaggedLogger("FileHandleDetector");

/**
 * Information about a process holding a file handle
 */
export interface FileHandleInfo {
  /** Process ID */
  pid: number;
  /** Process name/command */
  command: string;
  /** User running the process */
  user?: string;
  /** File descriptor or handle type */
  fd?: string;
  /** Access mode (read, write, etc.) */
  mode?: string;
}

/**
 * Detect processes holding handles to a specific file using lsof
 * @param filePath - Path to the file to check
 * @returns Array of processes holding handles to the file
 */
async function detectWithLsof(filePath: string): Promise<FileHandleInfo[]> {
  try {
    // lsof outputs: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
    const { stdout } = await execSimple(
      `lsof "${filePath}" 2>/dev/null || true`,
    );

    if (!stdout || stdout.trim() === "") {
      return [];
    }

    const lines = stdout.split("\n").slice(1); // Skip header
    const handles: FileHandleInfo[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        handles.push({
          command: parts[0],
          pid: Number.parseInt(parts[1], 10),
          user: parts[2],
          fd: parts[3],
          mode: parts[3]?.includes("w") ? "write" : "read",
        });
      }
    }

    logger.debug("Detected file handles with lsof", {
      file: filePath,
      handleCount: handles.length,
    });

    return handles;
  } catch (error) {
    logger.debug("lsof detection failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Detect processes holding handles to a specific file using fuser
 * @param filePath - Path to the file to check
 * @returns Array of processes holding handles to the file
 */
async function detectWithFuser(filePath: string): Promise<FileHandleInfo[]> {
  try {
    // fuser outputs PIDs of processes using the file
    const { stdout, stderr } = await execSimple(
      `fuser -v "${filePath}" 2>&1 || true`,
    );

    const output = stdout || stderr || "";
    if (output.trim() === "") {
      return [];
    }

    const handles: FileHandleInfo[] = [];
    const lines = output.split("\n").slice(1); // Skip header

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const pid = Number.parseInt(parts[1], 10);
        if (!Number.isNaN(pid)) {
          handles.push({
            user: parts[0],
            pid: pid,
            command: parts[2] || "unknown",
            mode: parts[3] || "unknown",
          });
        }
      }
    }

    logger.debug("Detected file handles with fuser", {
      file: filePath,
      handleCount: handles.length,
    });

    return handles;
  } catch (error) {
    logger.debug("fuser detection failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Windows-specific handle detection using handle.exe or PowerShell
 * @param filePath - Path to the file to check
 * @returns Array of processes holding handles to the file
 */
async function detectOnWindows(filePath: string): Promise<FileHandleInfo[]> {
  try {
    // Try PowerShell approach
    const psCommand = `Get-Process | ForEach-Object { $_.Modules } | Where-Object { $_.FileName -eq "${filePath}" } | Select-Object -Unique ProcessName, Id`;
    const { stdout } = await execSimple(`powershell -Command "${psCommand}"`);

    if (!stdout || stdout.trim() === "") {
      return [];
    }

    const handles: FileHandleInfo[] = [];
    const lines = stdout.split("\n").slice(2); // Skip headers

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        handles.push({
          command: parts[0],
          pid: Number.parseInt(parts[1], 10),
        });
      }
    }

    return handles;
  } catch (error) {
    logger.debug("Windows handle detection failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Detect all processes that have open handles to a specific file
 * @param filePath - Path to the file to check
 * @returns Array of processes holding handles to the file
 */
export async function detectFileHandles(
  filePath: string,
): Promise<FileHandleInfo[]> {
  const os = platform();

  logger.debug("Detecting file handles", { file: filePath, platform: os });

  if (os === "win32") {
    return detectOnWindows(filePath);
  }

  // Try lsof first (most common on Unix-like systems)
  let handles = await detectWithLsof(filePath);

  // Fallback to fuser if lsof didn't work
  if (handles.length === 0) {
    handles = await detectWithFuser(filePath);
  }

  if (handles.length > 0) {
    logger.info("File has open handles", {
      file: filePath,
      handleCount: handles.length,
      processes: handles.map((h) => ({
        pid: h.pid,
        command: h.command,
        mode: h.mode,
      })),
    });
  }

  return handles;
}

/**
 * Check if a file is locked by any process
 * @param filePath - Path to the file to check
 * @returns True if file has open handles, false otherwise
 */
export async function isFileLocked(filePath: string): Promise<boolean> {
  const handles = await detectFileHandles(filePath);
  return handles.length > 0;
}

/**
 * Get detailed information about processes locking a file
 * @param filePath - Path to the file to check
 * @returns Human-readable string describing the lock status
 */
export async function getFileLockInfo(filePath: string): Promise<string> {
  const handles = await detectFileHandles(filePath);

  if (handles.length === 0) {
    return "File is not locked";
  }

  const processInfo = handles
    .map(
      (h) =>
        `${h.command} (PID: ${h.pid}${h.user ? `, User: ${h.user}` : ""}${h.mode ? `, Mode: ${h.mode}` : ""})`,
    )
    .join(", ");

  return `File is locked by ${handles.length} process${handles.length > 1 ? "es" : ""}: ${processInfo}`;
}
