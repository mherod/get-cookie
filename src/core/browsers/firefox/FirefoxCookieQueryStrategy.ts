import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

import fg from "fast-glob";

import { getErrorMessage } from "@utils/errorUtils";
import type { createTaggedLogger } from "@utils/logHelpers";
import { getPlatform } from "@utils/platformUtils";
import { isFirefoxRunning } from "@utils/ProcessDetector";

import type { ExportedCookie } from "../../../types/schemas";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { BrowserLockHandler } from "../BrowserLockHandler";
import { getGlobalConnectionManager } from "../sql/DatabaseConnectionManager";
import { getGlobalQueryMonitor } from "../sql/QueryMonitor";

interface FirefoxCookieRow {
  name: string;
  value: string;
  domain: string;
  expiry: number;
}

/**
 * Find all Firefox cookie database files, optionally filtered by profile name.
 * @param logger - Logger instance for logging messages
 * @param profileName - Optional profile display name to filter by
 * @returns An array of file paths to Firefox cookie databases
 */
function findFirefoxCookieFiles(
  logger: ReturnType<typeof createTaggedLogger>,
  profileName?: string,
): string[] {
  const home = homedir();
  if (!home) {
    logger.warn("Failed to get home directory");
    return [];
  }

  // Fast path: Check if Firefox profile directories exist before attempting glob
  const platform = getPlatform();
  const profileDirs: string[] = [];
  const patterns: string[] = [];

  switch (platform) {
    case "darwin":
      profileDirs.push(join(home, "Library/Application Support/Firefox"));
      patterns.push(
        join(
          home,
          "Library/Application Support/Firefox/Profiles/*/cookies.sqlite",
        ),
      );
      break;
    case "win32": {
      // Regular Firefox
      profileDirs.push(join(home, "AppData", "Roaming", "Mozilla", "Firefox"));
      patterns.push(
        join(
          home,
          "AppData",
          "Roaming",
          "Mozilla",
          "Firefox",
          "Profiles",
          "*",
          "cookies.sqlite",
        ),
      );
      // Firefox Developer Edition
      const devEditionPath = join(
        home,
        "AppData",
        "Roaming",
        "Mozilla",
        "Firefox Developer Edition",
      );
      if (existsSync(devEditionPath)) {
        profileDirs.push(devEditionPath);
        patterns.push(join(devEditionPath, "Profiles", "*", "cookies.sqlite"));
      }
      // Firefox ESR (Extended Support Release)
      const esrPath = join(
        home,
        "AppData",
        "Roaming",
        "Mozilla",
        "Firefox ESR",
      );
      if (existsSync(esrPath)) {
        profileDirs.push(esrPath);
        patterns.push(join(esrPath, "Profiles", "*", "cookies.sqlite"));
      }
      // Also check Local AppData for some installations
      const localFirefoxPath = join(
        home,
        "AppData",
        "Local",
        "Mozilla",
        "Firefox",
      );
      if (existsSync(localFirefoxPath)) {
        profileDirs.push(localFirefoxPath);
        patterns.push(
          join(localFirefoxPath, "Profiles", "*", "cookies.sqlite"),
        );
      }
      break;
    }
    case "linux":
      profileDirs.push(join(home, ".mozilla/firefox"));
      patterns.push(join(home, ".mozilla/firefox/*/cookies.sqlite"));
      break;
    default:
      logger.debug("Unsupported platform for Firefox cookie extraction", {
        platform,
      });
      return [];
  }

  const existingProfileDirs = profileDirs.filter((dir) => existsSync(dir));

  if (existingProfileDirs.length === 0) {
    logger.debug(
      "No Firefox profile directories found - Firefox may not be installed",
      {
        checked: profileDirs,
        platform,
      },
    );
    return [];
  }

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = fg.sync(pattern);
    files.push(...matches);
  }

  logger.debug("Found Firefox cookie files", { files });

  if (profileName !== undefined && files.length > 0) {
    return filterByFirefoxProfile(
      files,
      profileName,
      existingProfileDirs,
      logger,
    );
  }

  return files;
}

/**
 * Parsed Firefox profile entry from profiles.ini
 */
interface FirefoxProfileEntry {
  name: string;
  path: string;
  isRelative: boolean;
}

/**
 * Parse Firefox profiles.ini to extract profile name-to-path mappings.
 * Firefox profiles.ini uses INI format with [ProfileN] sections containing
 * Name, Path, and IsRelative fields.
 * @param iniPath - Absolute path to the profiles.ini file
 * @returns Array of parsed profile entries
 */
function parseFirefoxProfilesIni(iniPath: string): FirefoxProfileEntry[] {
  try {
    const content = readFileSync(iniPath, "utf8");
    const lines = content.split(/\r?\n/);
    const profiles: FirefoxProfileEntry[] = [];

    let currentName: string | undefined;
    let currentPath: string | undefined;
    let currentIsRelative = true;

    for (const line of lines) {
      const trimmed = line.trim();

      // New section — flush the previous profile if complete
      if (trimmed.startsWith("[")) {
        if (currentName !== undefined && currentPath !== undefined) {
          profiles.push({
            name: currentName,
            path: currentPath,
            isRelative: currentIsRelative,
          });
        }
        currentName = undefined;
        currentPath = undefined;
        currentIsRelative = true;
        continue;
      }

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();

      if (key === "Name") {
        currentName = value;
      } else if (key === "Path") {
        currentPath = value;
      } else if (key === "IsRelative") {
        currentIsRelative = value === "1";
      }
    }

    // Flush last section
    if (currentName !== undefined && currentPath !== undefined) {
      profiles.push({
        name: currentName,
        path: currentPath,
        isRelative: currentIsRelative,
      });
    }

    return profiles;
  } catch {
    return [];
  }
}

/**
 * Filter Firefox cookie files to only those belonging to the named profile.
 * Reads profiles.ini from each Firefox data directory to resolve profile
 * display names to filesystem paths, then filters the cookie file list.
 * @param files - Array of discovered cookie file paths
 * @param profileName - The profile display name to match (case-insensitive)
 * @param profileDirs - Firefox data directories that may contain profiles.ini
 * @param logger - Logger instance
 * @returns Filtered array of cookie file paths
 */
function filterByFirefoxProfile(
  files: string[],
  profileName: string,
  profileDirs: string[],
  logger: ReturnType<typeof createTaggedLogger>,
): string[] {
  // Collect all profile directory names that match the requested profile name
  const matchingDirNames = new Set<string>();

  for (const dataDir of profileDirs) {
    const iniPath = join(dataDir, "profiles.ini");
    if (!existsSync(iniPath)) {
      continue;
    }

    const profiles = parseFirefoxProfilesIni(iniPath);

    for (const profile of profiles) {
      if (profile.name.toLowerCase() === profileName.toLowerCase()) {
        // Resolve the profile path to get the directory name
        const resolvedPath = profile.isRelative
          ? join(dataDir, profile.path)
          : profile.path;
        matchingDirNames.add(basename(resolvedPath));
      }
    }
  }

  if (matchingDirNames.size === 0) {
    logger.debug("Firefox profile not found in profiles.ini", {
      requestedProfile: profileName,
      checked: profileDirs,
    });
    return [];
  }

  const filtered = files.filter((file) => {
    // Cookie files are at <profileDir>/cookies.sqlite
    // The parent directory name is the profile directory
    const profileDirName = basename(join(file, ".."));
    return matchingDirNames.has(profileDirName);
  });

  if (filtered.length === 0) {
    logger.warn(`No cookie files found for Firefox profile: ${profileName}`);
  } else {
    logger.debug(
      `Found ${filtered.length} cookie file(s) for Firefox profile: ${profileName}`,
    );
  }

  return filtered;
}

/**
 * Strategy for querying cookies from Firefox browser.
 * This class extends the BaseCookieQueryStrategy and implements Firefox-specific
 * cookie extraction logic. It searches for cookie databases in standard Firefox
 * profile locations and extracts cookies matching the specified name and domain.
 * @example
 * ```typescript
 * import { FirefoxCookieQueryStrategy } from './FirefoxCookieQueryStrategy';
 *
 * const strategy = new FirefoxCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('sessionid', 'example.com');
 * console.log(cookies);
 * ```
 */
export class FirefoxCookieQueryStrategy extends BaseCookieQueryStrategy {
  private readonly lockHandler: BrowserLockHandler;
  private readonly profileName?: string;

  /**
   * Creates a new instance of FirefoxCookieQueryStrategy
   * @param profileName - Optional specific profile name to target (matches Name in profiles.ini)
   */
  public constructor(profileName?: string) {
    super("FirefoxCookieQueryStrategy", "Firefox");
    this.lockHandler = new BrowserLockHandler(this.logger, "Firefox");
    if (profileName !== undefined) {
      this.profileName = profileName;
    }
  }

  /**
   * Creates the query parameters for cookie extraction using the new query builder
   * @param name - The cookie name to search for
   * @param domain - The domain pattern to match cookies against
   * @param file - The database file path for metadata
   * @returns Query configuration object
   * @private
   */
  private async createCookieQueryConfig(
    name: string,
    domain: string,
    file: string,
  ): Promise<{
    file: string;
    sql: string;
    params: unknown[];
    rowTransform: (row: FirefoxCookieRow) => ExportedCookie;
  }> {
    // Import the query builder dynamically to avoid circular dependencies
    const { CookieQueryBuilder } = await import("../sql/CookieQueryBuilder");
    const queryBuilder = new CookieQueryBuilder("firefox");

    const queryConfig = queryBuilder.buildSelectQuery({
      name,
      domain,
      browser: "firefox",
    });

    return {
      file,
      sql: queryConfig.sql,
      params: queryConfig.params,
      rowTransform: (row: FirefoxCookieRow): ExportedCookie => ({
        name: row.name,
        value: row.value,
        domain: row.domain,
        expiry: row.expiry > 0 ? new Date(row.expiry * 1000) : "Infinity",
        meta: {
          file,
          browser: "Firefox",
          decrypted: false,
        },
      }),
    };
  }

  /**
   * Handles errors that occur during cookie extraction
   * @param error - The error that occurred
   * @param file - The database file being queried
   * @param force - Whether operations are being forced
   * @param name - The cookie name being searched
   * @param domain - The domain being searched
   * @returns Promise resolving to retry configuration
   * @private
   */
  private async handleCookieExtractionError(
    error: unknown,
    file: string,
    force: boolean | undefined,
    name: string,
    domain: string,
  ): Promise<{ retryAfterClose: boolean; shouldRelaunch: boolean }> {
    const processes = await isFirefoxRunning();
    const lockResult = await this.lockHandler.handleBrowserConflict(
      error,
      file,
      processes,
      force !== true,
    );

    if (lockResult.resolved) {
      return {
        retryAfterClose: true,
        shouldRelaunch: lockResult.shouldRelaunch,
      };
    }

    this.logExtractError(error, file, name, domain);
    return { retryAfterClose: false, shouldRelaunch: false };
  }

  /**
   * Logs cookie extraction errors in a consistent format
   * @param error - The error to log
   * @param file - The file that failed
   * @param name - The cookie name
   * @param domain - The domain
   * @private
   */
  private logExtractError(
    error: unknown,
    file: string,
    name: string,
    domain: string,
  ): void {
    this.logger.debug(`Error reading Firefox cookie file ${file}`, {
      error: getErrorMessage(error),
      file,
      name,
      domain,
    });
  }

  /**
   * Performs a retry attempt after browser closure
   * @param queryConfig - The cookie query configuration
   * @param shouldRelaunch - Whether to relaunch the browser after success
   * @returns Promise resolving to extracted cookies
   * @private
   */
  private async performRetryAfterClose(
    queryConfig: Awaited<ReturnType<typeof this.createCookieQueryConfig>>,
    shouldRelaunch: boolean,
  ): Promise<ExportedCookie[]> {
    this.logger.info(
      "Retrying Firefox cookie extraction after browser close...",
    );

    try {
      const cookies = await this.executeQueryWithNewUtilities(queryConfig);
      this.logger.success(
        "Successfully extracted cookies after closing Firefox",
      );

      if (shouldRelaunch) {
        await this.lockHandler.relaunchBrowser();
      }

      return cookies;
    } catch (retryError) {
      this.logger.error(
        "Failed to extract cookies even after closing Firefox",
        {
          error:
            retryError instanceof Error
              ? retryError.message
              : String(retryError),
          file: queryConfig.file,
        },
      );

      if (shouldRelaunch) {
        await this.lockHandler.relaunchBrowser();
      }

      return [];
    }
  }

  /**
   * Processes a single Firefox cookie file for the given parameters
   * @param file - The cookie file to process
   * @param name - The cookie name to search for
   * @param domain - The domain pattern to match
   * @param force - Whether to force operations despite warnings
   * @returns Promise resolving to extracted cookies from this file
   * @private
   */
  private async processCookieFile(
    file: string,
    name: string,
    domain: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    const queryConfig = await this.createCookieQueryConfig(name, domain, file);

    try {
      return await this.executeQueryWithNewUtilities(queryConfig);
    } catch (error) {
      const retryConfig = await this.handleCookieExtractionError(
        error,
        file,
        force,
        name,
        domain,
      );

      if (retryConfig.retryAfterClose) {
        return this.performRetryAfterClose(
          queryConfig,
          retryConfig.shouldRelaunch,
        );
      }

      return [];
    }
  }

  /**
   * Execute query using the new SQL utilities
   * @param queryConfig - Query configuration from createCookieQueryConfig
   * @param queryConfig.file
   * @param queryConfig.sql
   * @param queryConfig.params
   * @param queryConfig.rowTransform
   * @returns Promise resolving to exported cookies
   * @private
   */
  private async executeQueryWithNewUtilities(queryConfig: {
    file: string;
    sql: string;
    params: unknown[];
    rowTransform: (row: FirefoxCookieRow) => ExportedCookie;
  }): Promise<ExportedCookie[]> {
    const connectionManager = getGlobalConnectionManager({
      retryAttempts: 1, // Fail fast for Firefox - we have lock handling
      retryDelay: 0, // No delay - let lock handler deal with it
      queryTimeout: 100, // Very short timeout for Firefox to fail fast on locks
      enableMonitoring: true,
    });

    const monitor = getGlobalQueryMonitor();

    return connectionManager.executeQuery(
      queryConfig.file,
      (db) => {
        // Use the query monitor for tracking
        const rows = monitor.executeQuery<FirefoxCookieRow>(
          db,
          queryConfig.sql,
          queryConfig.params,
          queryConfig.file,
        );

        // Apply transformation
        return rows.map(queryConfig.rowTransform);
      },
      queryConfig.sql, // Pass SQL for monitoring
    );
  }

  /**
   * Executes the Firefox-specific query logic
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional path to a specific cookie store file
   * @param force - Whether to force operations despite warnings (e.g., locked databases)
   * @returns A promise that resolves to an array of exported cookies
   * @protected
   */
  protected async executeQuery(
    name: string,
    domain: string,
    store?: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    const files =
      store ?? findFirefoxCookieFiles(this.logger, this.profileName);
    const fileList = Array.isArray(files) ? files : [files];

    // Fast path: If no Firefox cookie files found (Firefox not installed),
    // return early to avoid unnecessary database queries and process detection
    if (fileList.length === 0) {
      this.logger.debug("No Firefox cookie files to query");
      return [];
    }

    const results: ExportedCookie[] = [];

    for (const file of fileList) {
      const cookies = await this.processCookieFile(file, name, domain, force);
      results.push(...cookies);
    }

    return results;
  }
}
