import { homedir } from "node:os";
import { join } from "node:path";

import { isSafariRunning } from "@utils/ProcessDetector";
import {
  checkFilePermission,
  handleSafariPermissionError,
} from "@utils/SystemPermissions";

import type { ExportedCookie } from "../../../types/schemas";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { BrowserLockHandler } from "../BrowserLockHandler";

import { decodeBinaryCookies } from "./decodeBinaryCookies";

/**
 * Strategy for querying cookies from Safari browser.
 * This class extends the BaseCookieQueryStrategy and implements Safari-specific
 * cookie extraction logic.
 */
export class SafariCookieQueryStrategy extends BaseCookieQueryStrategy {
  private lockHandler: BrowserLockHandler;

  /**
   * Creates a new instance of SafariCookieQueryStrategy
   */
  public constructor() {
    super("SafariCookieQueryStrategy", "Safari");
    this.lockHandler = new BrowserLockHandler(this.logger, "Safari");
  }

  /**
   * Gets the path to Safari's cookie database
   * @param home - The user's home directory
   * @returns Path to the cookie database
   */
  private getCookieDbPath(home: string): string {
    return join(
      home,
      "Library",
      "Containers",
      "com.apple.Safari",
      "Data",
      "Library",
      "Cookies",
      "Cookies.binarycookies",
    );
  }

  /**
   * Formats the domain by removing leading dot if present
   * @param domain - Domain to format
   * @returns Formatted domain or empty string if domain is invalid
   */
  private formatDomain(domain: string | undefined | null): string {
    if (domain === null || domain === undefined || typeof domain !== "string") {
      return "";
    }
    return domain.startsWith(".") ? domain.slice(1) : domain;
  }

  /**
   * Formats the expiry date
   * @param expiry - Expiry timestamp (Unix epoch seconds)
   * @returns Formatted expiry date or "Infinity"
   */
  private formatExpiry(
    expiry: number | undefined | null,
  ): Date | "Infinity" | undefined {
    // Handle undefined or null - return undefined instead of NaN date
    if (expiry === undefined || expiry === null) {
      return undefined;
    }

    if (typeof expiry !== "number" || Number.isNaN(expiry) || expiry <= 0) {
      return "Infinity";
    }

    // Validate timestamp is reasonable (1970-2100 range in seconds)
    const minTimestamp = 0; // 1970-01-01
    const maxTimestamp = 4102444800; // 2100-01-01

    if (expiry < minTimestamp || expiry > maxTimestamp) {
      this.logger.warn("Invalid expiry timestamp, treating as session cookie", {
        expiry,
      });
      return "Infinity";
    }

    return new Date(expiry * 1000);
  }

  /**
   * Checks if a flag bit is set
   * @param flags - The flags value
   * @param bit - The bit to check
   * @returns True if the bit is set, false otherwise
   */
  private isFlagSet(flags: number | undefined | null, bit: number): boolean {
    if (typeof flags !== "number" || Number.isNaN(flags) || flags <= 0) {
      return false;
    }
    return (flags & bit) === bit;
  }

  /**
   * Formats the creation timestamp
   * @param creation - Creation timestamp (Unix epoch seconds)
   * @returns Formatted creation timestamp in milliseconds or undefined
   */
  private formatCreation(
    creation: number | undefined | null,
  ): number | undefined {
    if (
      typeof creation !== "number" ||
      Number.isNaN(creation) ||
      creation <= 0
    ) {
      return undefined;
    }

    // Validate timestamp is reasonable (1970-2100 range in seconds)
    const minTimestamp = 0; // 1970-01-01
    const maxTimestamp = 4102444800; // 2100-01-01

    if (creation < minTimestamp || creation > maxTimestamp) {
      this.logger.warn("Invalid creation timestamp, ignoring", { creation });
      return undefined;
    }

    return creation * 1000;
  }

  /**
   * Processes a cookie value to ensure it's a string
   * @param value - The cookie value to process
   * @returns The processed value as a string
   */
  private processValue(value: unknown): string {
    if (value === null) {
      return "null";
    }

    if (value === undefined) {
      return "undefined";
    }

    if (Buffer.isBuffer(value)) {
      return value.toString();
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "[object Object]";
      }
    }

    // Handle primitives (string, number, boolean, etc.)
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    // Fallback for any other type (should not happen with proper typing)
    return "[unknown value]";
  }

  /**
   * Decodes cookies from Safari's binary cookie file
   * @param cookieDbPath - Path to the cookie database
   * @param name - Name of the cookie to find
   * @param domain - Domain to filter cookies by
   * @param force - Whether to skip interactive prompts
   * @returns Array of exported cookies
   */
  private async decodeCookies(
    cookieDbPath: string,
    name: string,
    domain: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    try {
      // Check permissions first
      const permissionResult = await this.checkAndHandlePermissions(
        cookieDbPath,
        force,
      );
      if (!permissionResult) {
        return [];
      }

      // Decode cookies and process them
      const cookies = decodeBinaryCookies(cookieDbPath);
      return this.processCookies(cookies, name, domain, cookieDbPath);
    } catch (error: unknown) {
      return this.handleDecodingError(error, cookieDbPath, name, domain, force);
    }
  }

  /**
   * Check file permissions and handle permission errors
   * @param cookieDbPath - Path to the cookie database
   * @param force - Whether to skip interactive prompts
   * @returns True if permissions are granted, false otherwise
   */
  private async checkAndHandlePermissions(
    cookieDbPath: string,
    force?: boolean,
  ): Promise<boolean> {
    const hasPermission = await checkFilePermission(cookieDbPath);
    if (hasPermission) {
      return true;
    }

    this.logger.warn("Cannot access Safari cookies due to macOS permissions", {
      file: cookieDbPath,
      suggestion: "Terminal application needs Full Disk Access permission",
    });

    // Try to handle the permission error interactively
    const permissionGranted = await handleSafariPermissionError(
      new Error("EPERM: operation not permitted"),
      {
        appName: process.env.TERM_PROGRAM ?? "Terminal",
        browserName: "Safari",
        interactive: force !== true,
      },
    );

    if (!permissionGranted) {
      return false;
    }

    // Check again after permission might have been granted
    const stillNoPermission = !(await checkFilePermission(cookieDbPath));
    if (stillNoPermission) {
      this.logger.error(
        "Still cannot access Safari cookies after permission attempt",
        {
          file: cookieDbPath,
          advice:
            "Please restart your terminal application after granting Full Disk Access",
        },
      );
      return false;
    }

    return true;
  }

  /**
   * Process and filter cookies based on name and domain criteria
   * @param cookies - Raw cookies from binary file
   * @param name - Name filter
   * @param domain - Domain filter
   * @param cookieDbPath - Path to cookie database for metadata
   * @returns Processed and filtered cookies
   */
  private processCookies(
    cookies: unknown[],
    name: string,
    domain: string,
    cookieDbPath: string,
  ): ExportedCookie[] {
    return cookies
      .filter((cookie) => this.matchesCriteria(cookie, name, domain))
      .map((cookie) => this.mapToExportedCookie(cookie, cookieDbPath));
  }

  /**
   * Check if cookie matches the search criteria
   * @param cookie - Raw cookie object
   * @param name - Name filter
   * @param domain - Domain filter
   * @returns True if cookie matches criteria
   */
  private matchesCriteria(
    cookie: unknown,
    name: string,
    domain: string,
  ): boolean {
    // Type guard for cookie object
    if (!this.isCookieObject(cookie)) {
      return false;
    }

    const formattedDomain = this.formatDomain(cookie.domain);

    // Skip cookies with invalid domains
    if (formattedDomain === "") {
      return false;
    }

    const nameMatches = name === "%" || cookie.name === name;
    const domainMatches = domain === "%" || formattedDomain.includes(domain);

    return nameMatches && domainMatches;
  }

  /**
   * Type guard to check if an object is a valid cookie object
   * @param cookie - Object to check
   * @returns True if object has expected cookie properties
   */
  private isCookieObject(cookie: unknown): cookie is {
    domain?: string;
    name: string;
    value: unknown;
    expiry?: number;
    creation?: number;
    flags?: number;
    path?: string;
    version?: number;
    comment?: string;
    commentURL?: string;
    port?: number;
  } {
    return (
      typeof cookie === "object" &&
      cookie !== null &&
      "name" in cookie &&
      typeof (cookie as { name: unknown }).name === "string"
    );
  }

  /**
   * Map raw cookie to ExportedCookie format
   * @param cookie - Raw cookie object
   * @param cookieDbPath - Path to cookie database for metadata
   * @returns Formatted ExportedCookie
   */
  private mapToExportedCookie(
    cookie: unknown,
    cookieDbPath: string,
  ): ExportedCookie {
    // We know it's a cookie object due to prior filtering
    const cookieObj = cookie as {
      domain?: string | null;
      name: string;
      value: unknown;
      expiry?: number | null;
      creation?: number | null;
      flags?: number | null;
      path?: string | null;
      version?: number | null;
      comment?: string | null;
      commentURL?: string | null;
      port?: number | null;
    };

    return {
      domain: this.formatDomain(cookieObj.domain),
      name: cookieObj.name,
      value: this.processValue(cookieObj.value),
      expiry: this.formatExpiry(cookieObj.expiry),
      meta: {
        file: cookieDbPath,
        browser: "Safari" as const,
        decrypted: false,
        secure: this.isFlagSet(cookieObj.flags, 0x1),
        httpOnly: this.isFlagSet(cookieObj.flags, 0x4),
        path: cookieObj.path ?? undefined,
        version: cookieObj.version ?? undefined,
        comment: cookieObj.comment ?? undefined,
        commentURL: cookieObj.commentURL ?? undefined,
        port: cookieObj.port ?? undefined,
        creation: this.formatCreation(cookieObj.creation),
      },
    };
  }

  /**
   * Handle errors that occur during cookie decoding
   * @param error - The error that occurred
   * @param cookieDbPath - Path to the cookie database
   * @param name - Name filter used
   * @param domain - Domain filter used
   * @param force - Whether interactive prompts were skipped
   * @returns Empty array as fallback
   */
  private async handleDecodingError(
    error: unknown,
    cookieDbPath: string,
    name: string,
    domain: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isPermissionError =
      errorMessage.includes("EPERM") ||
      errorMessage.includes("operation not permitted") ||
      errorMessage.includes("Permission denied");

    if (isPermissionError) {
      await this.handlePermissionError(
        error,
        cookieDbPath,
        name,
        domain,
        force,
      );
    } else {
      this.logDecodingError(error, cookieDbPath, name, domain);
    }

    return [];
  }

  /**
   * Handle permission-related errors
   * @param error - The error that occurred
   * @param cookieDbPath - Path to the cookie database
   * @param name - Name filter used
   * @param domain - Domain filter used
   * @param force - Whether interactive prompts were skipped
   */
  private async handlePermissionError(
    error: unknown,
    cookieDbPath: string,
    name: string,
    domain: string,
    force?: boolean,
  ): Promise<void> {
    const handled = await handleSafariPermissionError(error as Error, {
      appName: process.env.TERM_PROGRAM ?? "Terminal",
      browserName: "Safari",
      interactive: force !== true,
    });

    if (handled) {
      this.logger.info(
        "Permission flow completed. Please run the command again after granting access.",
      );
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Permission denied accessing Safari cookies at ${cookieDbPath}`,
        {
          error: errorMessage,
          file: cookieDbPath,
          name,
          domain,
          advice:
            "Grant Full Disk Access to your terminal in System Settings > Privacy & Security",
        },
      );
    }
  }

  /**
   * Log non-permission errors that occur during decoding
   * @param error - The error that occurred
   * @param cookieDbPath - Path to the cookie database
   * @param name - Name filter used
   * @param domain - Domain filter used
   */
  private logDecodingError(
    error: unknown,
    cookieDbPath: string,
    name: string,
    domain: string,
  ): void {
    const errorInfo = {
      file: cookieDbPath,
      name,
      domain,
    };

    if (error instanceof Error) {
      this.logger.error(`Error decoding ${cookieDbPath}`, {
        ...errorInfo,
        error: error.message,
      });
    } else {
      this.logger.error(`Error decoding ${cookieDbPath}`, {
        ...errorInfo,
        error: String(error),
      });
    }
  }

  /**
   * Executes the Safari-specific query logic
   * @param name - Name of the cookie to find
   * @param domain - Domain to filter cookies by
   * @param store - Optional store path
   * @param force - Whether to force operations despite warnings (e.g., locked databases)
   * @returns Array of matching cookies, or empty array if none found
   * @protected
   */
  protected async executeQuery(
    name: string,
    domain: string,
    store?: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    try {
      this.logger.info("Querying cookies", { name, domain, store });

      // Validate home directory
      const home = homedir();
      if (!this.isValidHomeDirectory(home)) {
        return [];
      }

      const cookieDbPath = store ?? this.getCookieDbPath(home);
      const normalizedName = name || "%";
      const normalizedDomain = domain || "%";

      // First attempt to decode cookies
      const firstAttemptResult = await this.attemptDecodeWithLockHandling(
        cookieDbPath,
        normalizedName,
        normalizedDomain,
        force,
      );

      if (firstAttemptResult.success) {
        return firstAttemptResult.cookies;
      }

      // Handle retry scenario if browser was closed
      if (firstAttemptResult.shouldRetry) {
        return this.retryAfterBrowserClose(
          cookieDbPath,
          normalizedName,
          normalizedDomain,
          force,
          firstAttemptResult.shouldRelaunch,
        );
      }

      return [];
    } catch (error: unknown) {
      this.logQueryError(error, name, domain);
      return [];
    }
  }

  /**
   * Validate home directory
   * @param home - Home directory path
   * @returns True if valid, false otherwise
   */
  private isValidHomeDirectory(home: string): boolean {
    if (typeof home !== "string" || home.length === 0) {
      this.logger.error("Failed to get home directory");
      return false;
    }
    return true;
  }

  /**
   * Attempt to decode cookies with lock conflict handling
   * @param cookieDbPath - Path to cookie database
   * @param name - Normalized cookie name filter
   * @param domain - Normalized domain filter
   * @param force - Whether to force operations
   * @returns Result object with success status and data
   */
  private async attemptDecodeWithLockHandling(
    cookieDbPath: string,
    name: string,
    domain: string,
    force?: boolean,
  ): Promise<{
    success: boolean;
    cookies: ExportedCookie[];
    shouldRetry: boolean;
    shouldRelaunch: boolean;
  }> {
    try {
      const cookies = await this.decodeCookies(
        cookieDbPath,
        name,
        domain,
        force,
      );
      return {
        success: true,
        cookies,
        shouldRetry: false,
        shouldRelaunch: false,
      };
    } catch (error: unknown) {
      return this.handleLockConflict(error, cookieDbPath, force);
    }
  }

  /**
   * Handle browser lock conflicts
   * @param error - The error that occurred
   * @param cookieDbPath - Path to cookie database
   * @param force - Whether to force operations
   * @returns Result indicating what action to take next
   */
  private async handleLockConflict(
    error: unknown,
    cookieDbPath: string,
    force?: boolean,
  ): Promise<{
    success: boolean;
    cookies: ExportedCookie[];
    shouldRetry: boolean;
    shouldRelaunch: boolean;
  }> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (!this.isLockError(errorMessage)) {
      throw error; // Re-throw non-lock errors
    }

    const processes = await isSafariRunning();
    const lockResult = await this.lockHandler.handleBrowserConflict(
      error,
      cookieDbPath,
      processes,
      force !== true,
    );

    if (lockResult.resolved) {
      return {
        success: false,
        cookies: [],
        shouldRetry: true,
        shouldRelaunch: lockResult.shouldRelaunch,
      };
    }

    this.logger.warn("Safari cookie file locked", {
      error: errorMessage,
      file: cookieDbPath,
      advice:
        "Safari may be accessing the cookie file. Try closing Safari and running again.",
    });

    return {
      success: false,
      cookies: [],
      shouldRetry: false,
      shouldRelaunch: false,
    };
  }

  /**
   * Check if error indicates a lock conflict
   * @param errorMessage - Error message to check
   * @returns True if this is a lock-related error
   */
  private isLockError(errorMessage: string): boolean {
    return (
      errorMessage.includes("EPERM") ||
      errorMessage.includes("operation not permitted") ||
      errorMessage.includes("Permission denied") ||
      errorMessage.includes("EBUSY")
    );
  }

  /**
   * Retry cookie extraction after browser was closed
   * @param cookieDbPath - Path to cookie database
   * @param name - Cookie name filter
   * @param domain - Domain filter
   * @param force - Whether to force operations
   * @param shouldRelaunch - Whether browser should be relaunched
   * @returns Cookies or empty array
   */
  private async retryAfterBrowserClose(
    cookieDbPath: string,
    name: string,
    domain: string,
    force?: boolean,
    shouldRelaunch?: boolean,
  ): Promise<ExportedCookie[]> {
    try {
      this.logger.info(
        "Retrying Safari cookie extraction after browser close...",
      );

      const cookies = await this.decodeCookies(
        cookieDbPath,
        name,
        domain,
        force,
      );

      this.logger.success(
        "Successfully extracted cookies after closing Safari",
      );

      if (shouldRelaunch === true) {
        await this.lockHandler.relaunchBrowser();
      }

      return cookies;
    } catch (retryError: unknown) {
      return this.handleRetryFailure(retryError, cookieDbPath, shouldRelaunch);
    }
  }

  /**
   * Handle failure during retry attempt
   * @param retryError - Error that occurred during retry
   * @param cookieDbPath - Path to cookie database
   * @param shouldRelaunch - Whether browser should be relaunched
   * @returns Empty array
   */
  private async handleRetryFailure(
    retryError: unknown,
    cookieDbPath: string,
    shouldRelaunch?: boolean,
  ): Promise<ExportedCookie[]> {
    this.logger.error("Failed to extract cookies even after closing Safari", {
      error:
        retryError instanceof Error ? retryError.message : String(retryError),
      file: cookieDbPath,
    });

    // Still try to relaunch Safari if needed
    if (shouldRelaunch === true) {
      await this.lockHandler.relaunchBrowser();
    }

    return [];
  }

  /**
   * Log query errors
   * @param error - The error that occurred
   * @param name - Cookie name filter
   * @param domain - Domain filter
   */
  private logQueryError(error: unknown, name: string, domain: string): void {
    const errorInfo = { name, domain };

    if (error instanceof Error) {
      this.logger.error("Failed to query cookies", {
        ...errorInfo,
        error: error.message,
      });
    } else {
      this.logger.error("Failed to query cookies", {
        ...errorInfo,
        error: String(error),
      });
    }
  }
}
