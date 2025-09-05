import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { errorMessageContains, getErrorMessage } from "./errorUtils";
import { createTaggedLogger } from "./logHelpers";
import { getPlatform, isWindows } from "./platformUtils";

const execFileAsync = promisify(execFile);
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
 * SECURITY: Uses execFile to prevent shell injection
 * @param filePath - Path to the file to check
 * @returns Array of processes holding handles to the file
 */
async function detectWithLsof(filePath: string): Promise<FileHandleInfo[]> {
  try {
    // Use execFile instead of exec to prevent shell injection
    const { stdout } = await execFileAsync("lsof", [filePath], {
      encoding: "utf8",
    });

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
    const errorMessage = getErrorMessage(error);

    // Check if lsof is not found
    if (errorMessageContains(error, "ENOENT")) {
      logger.debug("lsof not available on this system");
    } else if (errorMessageContains(error, "No such file")) {
      // File doesn't exist - return empty array
      logger.debug("File does not exist", { file: filePath });
    } else {
      logger.debug("lsof detection failed", { error: errorMessage });
    }

    return [];
  }
}

/**
 * Detect processes holding handles to a specific file using fuser
 * SECURITY: Uses execFile to prevent shell injection
 * @param filePath - Path to the file to check
 * @returns Array of processes holding handles to the file
 */
async function detectWithFuser(filePath: string): Promise<FileHandleInfo[]> {
  try {
    // fuser outputs to stderr, not stdout
    // Use execFile to prevent shell injection
    const result = await execFileAsync("fuser", ["-v", filePath], {
      encoding: "utf8",
    });

    // fuser writes to stderr even on success
    const output = result.stderr || result.stdout || "";

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
    const errorMessage = getErrorMessage(error);

    if (errorMessageContains(error, "ENOENT")) {
      logger.debug("fuser not available on this system");
    } else {
      logger.debug("fuser detection failed", { error: errorMessage });
    }

    return [];
  }
}

/**
 * Windows-specific handle detection using PowerShell
 * SECURITY: Properly escapes file path for PowerShell
 * @param filePath - Path to the file to check
 * @returns Array of processes holding handles to the file
 */
async function detectOnWindows(filePath: string): Promise<FileHandleInfo[]> {
  try {
    // Escape single quotes in the file path for PowerShell
    const escapedPath = filePath.replace(/'/g, "''");

    // Use Get-Process with error handling
    const psScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      $handles = @()
      
      # Try to find processes with the file open
      Get-Process | ForEach-Object {
        try {
          $proc = $_
          # Check if any modules match the file path
          $modules = $proc.Modules | Where-Object { $_.FileName -eq '${escapedPath}' }
          if ($modules) {
            $handles += [PSCustomObject]@{
              ProcessName = $proc.ProcessName
              ProcessId = $proc.Id
            }
          }
        } catch {
          # Skip processes we can't access
        }
      }
      
      # Also try using Get-CimInstance for better file handle detection
      try {
        $query = "SELECT * FROM CIM_DataFile WHERE Name='${escapedPath.replace(/\\/g, "\\\\")}'"
        $file = Get-CimInstance -Query $query -ErrorAction SilentlyContinue
        if ($file) {
          $assoc = Get-CimAssociatedInstance -InputObject $file -ResultClassName Win32_Process
          foreach ($proc in $assoc) {
            $handles += [PSCustomObject]@{
              ProcessName = $proc.Name
              ProcessId = $proc.ProcessId
            }
          }
        }
      } catch {
        # WMI query failed, ignore
      }
      
      $handles | ConvertTo-Json -Compress
    `;

    const { stdout } = await execFileAsync(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", psScript],
      { encoding: "utf8", maxBuffer: 1024 * 1024 },
    );

    if (!stdout || stdout.trim() === "" || stdout.trim() === "null") {
      return [];
    }

    const handles: FileHandleInfo[] = [];

    try {
      const parsed = JSON.parse(stdout);
      const results = Array.isArray(parsed) ? parsed : [parsed];

      for (const result of results) {
        if (result?.ProcessId) {
          handles.push({
            command: result.ProcessName || "unknown",
            pid: Number.parseInt(result.ProcessId, 10),
          });
        }
      }
    } catch (parseError) {
      logger.debug("Failed to parse PowerShell output", {
        error: getErrorMessage(parseError),
      });
    }

    logger.debug("Detected file handles with PowerShell", {
      file: filePath,
      handleCount: handles.length,
    });

    return handles;
  } catch (error) {
    logger.debug("Windows handle detection failed", {
      error: getErrorMessage(error),
    });
    return [];
  }
}

/**
 * Try to detect using handle.exe from Sysinternals (if available)
 * SECURITY: Uses execFile to prevent shell injection
 * @param filePath - Path to the file to check
 * @returns Array of processes holding handles to the file
 */
async function detectWithHandleExe(
  filePath: string,
): Promise<FileHandleInfo[]> {
  try {
    // handle.exe must be in PATH or current directory
    const { stdout } = await execFileAsync("handle", ["-nobanner", filePath], {
      encoding: "utf8",
    });

    if (!stdout || stdout.trim() === "") {
      return [];
    }

    const handles: FileHandleInfo[] = [];
    const lines = stdout.split("\n");

    for (const line of lines) {
      // Format: process.exe pid: type handle: path
      const match = line.match(
        /^(.+?)\s+pid:\s+(\d+)\s+type:\s+(\w+)\s+.+:\s+(.+)$/i,
      );
      if (match) {
        handles.push({
          command: match[1],
          pid: Number.parseInt(match[2], 10),
          fd: match[3],
          mode: "unknown",
        });
      }
    }

    logger.debug("Detected file handles with handle.exe", {
      file: filePath,
      handleCount: handles.length,
    });

    return handles;
  } catch {
    // handle.exe not available, silently fall back
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
  const os = getPlatform();

  logger.debug("Detecting file handles", { file: filePath, platform: os });

  if (isWindows()) {
    // Try handle.exe first (most accurate)
    const handles = await detectWithHandleExe(filePath);
    if (handles.length > 0) {
      return handles;
    }

    // Fall back to PowerShell
    return detectOnWindows(filePath);
  }

  // Unix-like systems: try lsof first
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
