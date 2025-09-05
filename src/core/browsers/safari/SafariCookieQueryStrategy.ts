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
   * @returns Formatted domain
   */
  private formatDomain(domain: string): string {
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

    return String(value);
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
      // First check if we can access the file
      const hasPermission = await checkFilePermission(cookieDbPath);
      if (!hasPermission) {
        this.logger.warn(
          "Cannot access Safari cookies due to macOS permissions",
          {
            file: cookieDbPath,
            suggestion:
              "Terminal application needs Full Disk Access permission",
          },
        );

        // Try to handle the permission error interactively
        const permissionGranted = await handleSafariPermissionError(
          new Error("EPERM: operation not permitted"),
          {
            appName: process.env.TERM_PROGRAM || "Terminal",
            browserName: "Safari",
            interactive: force !== true,
          },
        );

        if (!permissionGranted) {
          return [];
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
          return [];
        }
      }

      const cookies = decodeBinaryCookies(cookieDbPath);
      return cookies
        .filter(
          (cookie) =>
            (name === "%" || cookie.name === name) &&
            (domain === "%" ||
              this.formatDomain(cookie.domain).includes(domain)),
        )
        .map((cookie) => ({
          domain: this.formatDomain(cookie.domain),
          name: cookie.name,
          value: this.processValue(cookie.value),
          expiry: this.formatExpiry(cookie.expiry),
          meta: {
            file: cookieDbPath,
            browser: "Safari" as const,
            decrypted: false,
            secure: this.isFlagSet(cookie.flags, 0x1),
            httpOnly: this.isFlagSet(cookie.flags, 0x4),
            path: cookie.path,
            version: cookie.version,
            comment: cookie.comment,
            commentURL: cookie.commentURL,
            port: cookie.port,
            creation: this.formatCreation(cookie.creation),
          },
        }));
    } catch (error) {
      // Permission errors are common on macOS
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isPermissionError =
        errorMessage.includes("EPERM") ||
        errorMessage.includes("operation not permitted") ||
        errorMessage.includes("Permission denied");

      if (isPermissionError) {
        // Try to handle permission error with System Settings
        const handled = await handleSafariPermissionError(error as Error, {
          appName: process.env.TERM_PROGRAM || "Terminal",
          browserName: "Safari",
          interactive: force !== true,
        });

        if (handled) {
          this.logger.info(
            "Permission flow completed. Please run the command again after granting access.",
          );
        } else {
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
      } else if (error instanceof Error) {
        this.logger.error(`Error decoding ${cookieDbPath}`, {
          error: error.message,
          file: cookieDbPath,
          name,
          domain,
        });
      } else {
        this.logger.error(`Error decoding ${cookieDbPath}`, {
          error: String(error),
          file: cookieDbPath,
          name,
          domain,
        });
      }
      return [];
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

      const home = homedir();
      if (typeof home !== "string" || home.length === 0) {
        this.logger.error("Failed to get home directory");
        return [];
      }

      const cookieDbPath = store ?? this.getCookieDbPath(home);
      let retryAfterClose = false;
      let shouldRelaunch = false;

      try {
        return await this.decodeCookies(
          cookieDbPath,
          name || "%",
          domain || "%",
          force,
        );
      } catch (error) {
        // Check for file lock errors (Safari often locks its cookie file)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("EPERM") ||
          errorMessage.includes("operation not permitted") ||
          errorMessage.includes("Permission denied") ||
          errorMessage.includes("EBUSY")
        ) {
          const processes = await isSafariRunning();
          const lockResult = await this.lockHandler.handleBrowserConflict(
            error,
            cookieDbPath,
            processes,
            force !== true,
          );

          if (lockResult.resolved) {
            retryAfterClose = true;
            shouldRelaunch = lockResult.shouldRelaunch;
          } else {
            this.logger.warn("Safari cookie file locked", {
              error: errorMessage,
              file: cookieDbPath,
              advice:
                "Safari may be accessing the cookie file. Try closing Safari and running again.",
            });
            return [];
          }
        } else {
          throw error;
        }
      }

      // Retry if browser was closed
      if (retryAfterClose) {
        try {
          this.logger.info(
            "Retrying Safari cookie extraction after browser close...",
          );
          const cookies = await this.decodeCookies(
            cookieDbPath,
            name || "%",
            domain || "%",
            force,
          );

          this.logger.success(
            "Successfully extracted cookies after closing Safari",
          );

          // Relaunch Safari if it was closed
          if (shouldRelaunch) {
            await this.lockHandler.relaunchBrowser();
          }

          return cookies;
        } catch (retryError) {
          this.logger.error(
            "Failed to extract cookies even after closing Safari",
            {
              error:
                retryError instanceof Error
                  ? retryError.message
                  : String(retryError),
              file: cookieDbPath,
            },
          );

          // Still try to relaunch Safari if needed
          if (shouldRelaunch) {
            await this.lockHandler.relaunchBrowser();
          }

          return [];
        }
      }

      return [];
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error("Failed to query cookies", {
          error: error.message,
          name,
          domain,
        });
      } else {
        this.logger.error("Failed to query cookies", {
          error: String(error),
          name,
          domain,
        });
      }
      return [];
    }
  }
}
