import { getErrorDetails } from "@utils/errorUtils";
import { createTaggedLogger } from "@utils/logHelpers";

import type {
  BrowserName,
  CookieQueryStrategy,
  ExportedCookie,
} from "../../types/schemas";

// Create a simple fallback logger for tests
const fallbackLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  success: () => {},
  fatal: () => {},
  log: () => {},
};

/**
 * Base class for cookie query strategies.
 * Provides common functionality and standardized error handling for browser-specific implementations.
 * @implements {CookieQueryStrategy}
 * @abstract
 */
export abstract class BaseCookieQueryStrategy implements CookieQueryStrategy {
  /**
   * Logger instance for this strategy
   * @protected
   */
  protected readonly logger;

  /**
   * Creates a new instance of BaseCookieQueryStrategy
   * @param strategyName - The name of the strategy for logging purposes
   * @param browserName - The name of the browser this strategy is for
   */
  public constructor(
    strategyName: string,
    public readonly browserName: BrowserName,
  ) {
    const taggedLogger = createTaggedLogger(strategyName);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    this.logger = taggedLogger || fallbackLogger;
  }

  /**
   * Queries cookies from the browser's cookie store
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional path to a specific cookie store file
   * @param force - Whether to force operations despite warnings (e.g., locked databases)
   * @returns A promise that resolves to an array of exported cookies
   */
  public async queryCookies(
    name: string,
    domain: string,
    store?: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    try {
      this.logger.info("Querying cookies", { name, domain, store, force });
      return await this.executeQuery(name, domain, store, force);
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      this.logger.error("Failed to query cookies", {
        ...errorDetails,
        browser: this.browserName,
        strategy: this.constructor.name,
        name,
        domain,
        store,
        force,
      });
      return [];
    }
  }

  /**
   * Executes the browser-specific query logic
   * @abstract
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional path to a specific cookie store file
   * @param force - Whether to force operations despite warnings (e.g., locked databases)
   * @returns A promise that resolves to an array of exported cookies
   * @protected
   */
  protected abstract executeQuery(
    name: string,
    domain: string,
    store?: string,
    force?: boolean,
  ): Promise<ExportedCookie[]>;
}
