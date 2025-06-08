import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import logger from './logger';

export interface SafeFileOperationOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  useTempCopy?: boolean;
}

export class SafeFileOperations {
  private static readonly DEFAULT_OPTIONS: Required<SafeFileOperationOptions> = {
    maxRetries: 3,
    retryDelayMs: 100,
    useTempCopy: true,
  };

  /**
   * Safely reads a file with fallback to temporary copy if the original is locked
   * @param filePath - Path to the file to read
   * @param options - Options for the safe operation
   * @returns Buffer containing file contents
   * @throws Error if file cannot be read after all retry attempts
   */
  static async readFileWithFallback(
    filePath: string,
    options: SafeFileOperationOptions = {}
  ): Promise<Buffer> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // First try to read the file directly
    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      try {
        logger.debug(`Attempting to read file directly: ${filePath} (attempt ${attempt})`);
        return await fs.promises.readFile(filePath);
      } catch (error) {
        const isLockError = this.isFileLockError(error);
        
        if (!isLockError) {
          throw error; // Re-throw non-lock errors immediately
        }
        
        logger.debug(`File appears to be locked: ${filePath}, attempt ${attempt}/${opts.maxRetries}`);
        
        if (attempt < opts.maxRetries) {
          await this.delay(opts.retryDelayMs * attempt);
        }
      }
    }
    
    // If direct reading failed and temp copy is enabled, try temp copy fallback
    if (opts.useTempCopy) {
      logger.debug(`All direct read attempts failed, trying temp copy fallback for: ${filePath}`);
      return await this.readViaTemporaryCopy(filePath);
    }
    
    throw new Error(`Failed to read file after ${opts.maxRetries} attempts: ${filePath}`);
  }

  /**
   * Checks if an error is related to file locking
   * @param error - The error to check
   * @returns true if the error appears to be a file lock error
   */
  private static isFileLockError(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }
    
    const errorWithCode = error as { code: unknown };
    if (typeof errorWithCode.code !== 'string') {
      return false;
    }
    
    const lockErrorCodes = ['EBUSY', 'EMFILE', 'ENFILE', 'EACCES', 'EAGAIN'];
    return lockErrorCodes.includes(errorWithCode.code);
  }

  /**
   * Attempts to read a file by creating a temporary copy
   * @param filePath - Path to the original file
   * @returns Buffer containing file contents from the temporary copy
   */
  private static async readViaTemporaryCopy(filePath: string): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const fileName = path.basename(filePath);
    const tempPath = path.join(tempDir, `get-cookie-${Date.now()}-${fileName}`);
    
    try {
      logger.debug(`Creating temporary copy: ${filePath} -> ${tempPath}`);
      
      // Create temporary copy using OS-level copy commands for better lock handling
      if (process.platform === 'win32') {
        await this.executeCommand(`copy "${filePath}" "${tempPath}"`);
      } else {
        await this.executeCommand(`cp "${filePath}" "${tempPath}"`);
      }
      
      // Read from the temporary copy
      const content = await fs.promises.readFile(tempPath);
      logger.debug(`Successfully read from temporary copy: ${tempPath}`);
      
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.debug(`Failed to read via temporary copy: ${errorMessage}`);
      throw new Error(`Failed to create or read temporary copy of locked file: ${filePath}`);
    } finally {
      // Clean up temporary file
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
          logger.debug(`Cleaned up temporary file: ${tempPath}`);
        }
      } catch (cleanupError) {
        logger.warn(`Failed to clean up temporary file: ${tempPath}`, cleanupError);
      }
    }
  }

  /**
   * Executes a shell command
   * @param command - The command to execute
   * @returns Promise that resolves when command completes
   */
  private static executeCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, (error, _stdout, stderr) => {
        if (error !== null) {
          reject(new Error(`Command failed: ${command}\nError: ${error.message}\nStderr: ${stderr}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Delays execution for the specified number of milliseconds
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Checks if a file is likely locked by attempting a non-destructive operation
   * @param filePath - Path to the file to check
   * @returns true if the file appears to be locked
   */
  public static async isFileLocked(filePath: string): Promise<boolean> {
    try {
      // Try to open the file in read mode
      const fd = await fs.promises.open(filePath, 'r');
      await fd.close();
      return false;
    } catch (error) {
      return this.isFileLockError(error);
    }
  }
}