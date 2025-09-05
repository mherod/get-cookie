import { detectFileHandles } from "./FileHandleDetector";
import { createTaggedLogger } from "./logHelpers";

const logger = createTaggedLogger("WaitForFileLock");

export interface WaitForLockOptions {
  /** Maximum time to wait in milliseconds */
  maxWaitTime?: number;
  /** Interval between checks in milliseconds */
  checkInterval?: number;
  /** Callback when lock is detected */
  onLockDetected?: (handles: Array<{ pid: number; command: string }>) => void;
  /** Callback for progress updates */
  onProgress?: (elapsedMs: number, remainingMs: number) => void;
}

/**
 * Wait for a file lock to be released
 * @param filePath - Path to the file to monitor
 * @param options - Options for waiting
 * @returns Promise that resolves when lock is released or timeout occurs
 */
export async function waitForFileLockRelease(
  filePath: string,
  options: WaitForLockOptions = {},
): Promise<boolean> {
  const {
    maxWaitTime = 30000, // 30 seconds default
    checkInterval = 500, // Check every 500ms
    onLockDetected,
    onProgress,
  } = options;

  const startTime = Date.now();
  let lastHandleCount = 0;

  logger.info("Waiting for file lock to be released", {
    file: filePath,
    maxWaitTime,
    checkInterval,
  });

  while (Date.now() - startTime < maxWaitTime) {
    const handles = await detectFileHandles(filePath);

    if (handles.length === 0) {
      logger.success("File lock has been released", {
        file: filePath,
        waitedMs: Date.now() - startTime,
      });
      return true;
    }

    // Notify if handle count changed
    if (handles.length !== lastHandleCount) {
      lastHandleCount = handles.length;

      if (onLockDetected) {
        onLockDetected(
          handles.map((h) => ({ pid: h.pid, command: h.command })),
        );
      }

      logger.debug("File still locked", {
        file: filePath,
        handleCount: handles.length,
        processes: handles.map((h) => h.command).join(", "),
      });
    }

    // Progress callback
    if (onProgress) {
      const elapsed = Date.now() - startTime;
      const remaining = maxWaitTime - elapsed;
      onProgress(elapsed, remaining);
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  logger.warn("Timeout waiting for file lock release", {
    file: filePath,
    waitedMs: maxWaitTime,
  });

  return false;
}

/**
 * Try an operation with automatic retry if file is locked
 * @param filePath - File that might be locked
 * @param operation - Operation to perform
 * @param options - Wait options
 * @returns Result of the operation or null if timeout
 */
export async function tryWithLockWait<T>(
  filePath: string,
  operation: () => Promise<T>,
  options: WaitForLockOptions = {},
): Promise<T | null> {
  try {
    // First attempt
    return await operation();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message.toLowerCase() : "";

    // Check if it's a lock error
    if (
      errorMessage.includes("database is locked") ||
      errorMessage.includes("sqlite_busy") ||
      errorMessage.includes("eperm")
    ) {
      logger.info("Operation blocked by file lock, waiting for release", {
        file: filePath,
      });

      // Wait for lock release
      const released = await waitForFileLockRelease(filePath, options);

      if (released) {
        logger.info("Retrying operation after lock release");
        try {
          return await operation();
        } catch (retryError) {
          logger.error("Operation failed even after lock release", {
            error:
              retryError instanceof Error
                ? retryError.message
                : String(retryError),
          });
          throw retryError;
        }
      } else {
        logger.error("Timeout waiting for lock release");
        return null;
      }
    }

    throw error;
  }
}
