import { flatMapAsync } from "@utils/flatMapAsync";
import { createTaggedLogger } from "@utils/logHelpers";

import type {
  BrowserName,
  CookieQueryStrategy,
  ExportedCookie,
} from "../../types/schemas";

/**
 * A composite strategy that combines multiple cookie query strategies.
 * This class implements the CookieQueryStrategy interface and allows querying cookies
 * from multiple browser-specific strategies simultaneously.
 * @example
 * ```typescript
 * const strategy = new CompositeCookieQueryStrategy([
 *   new ChromeCookieQueryStrategy(),
 *   new FirefoxCookieQueryStrategy(),
 *   new SafariCookieQueryStrategy()
 * ]);
 * const cookies = await strategy.queryCookies('sessionId', 'example.com');
 * ```
 */
export class CompositeCookieQueryStrategy implements CookieQueryStrategy {
  private readonly logger = createTaggedLogger("CompositeCookieQueryStrategy");

  /**
   * The browser name identifier for this strategy
   * @remarks Always returns 'internal' as this is a composite strategy
   */
  public readonly browserName: BrowserName = "internal";

  /**
   * Creates a new instance of CompositeCookieQueryStrategy
   * @param strategies - Array of browser-specific strategies to use for querying cookies
   * @remarks
   * - Each strategy in the array should implement the CookieQueryStrategy interface
   * - The order of strategies determines the order of cookie querying
   * - Failed strategies will be gracefully handled and skipped
   * @example
   * ```typescript
   * const strategy = new CompositeCookieQueryStrategy([
   *   new ChromeCookieQueryStrategy(),
   *   new FirefoxCookieQueryStrategy()
   * ]);
   * ```
   */
  public constructor(private strategies: CookieQueryStrategy[]) {}

  /**
   * Handles strategy-specific errors and logs them appropriately
   * @internal
   * @param error - The error that occurred during strategy execution
   * @param strategy - The strategy that failed
   */
  private handleStrategyError(
    error: unknown,
    strategy: CookieQueryStrategy,
  ): void {
    if (error instanceof Error) {
      this.logger.error("Strategy failed", { error, strategy });
    } else {
      this.logger.error("Strategy failed with unknown error", {
        error: String(error),
        strategy,
      });
    }
  }

  /**
   * Queries cookies using all available strategies in parallel
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @returns Promise resolving to combined array of cookies from all strategies
   * @remarks
   * - Failures in individual strategies are logged but don't affect other strategies
   * - Results are combined from all successful strategy queries
   * - Empty arrays are returned for failed strategy queries
   * @example
   * ```typescript
   * const strategy = new CompositeCookieQueryStrategy([
   *   new ChromeCookieQueryStrategy(),
   *   new FirefoxCookieQueryStrategy()
   * ]);
   * const cookies = await strategy.queryCookies('sessionId', 'example.com');
   * console.log(cookies); // Combined results from all browsers
   * ```
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    try {
      this.logger.info("Querying cookies from all strategies", {
        name,
        domain,
        strategyCount: this.strategies.length,
      });

      /**
       * Use flatMapAsync to process strategies in sequence while collecting results
       * This approach provides better error isolation than Promise.all
       * Each strategy failure is handled independently
       */
      return await flatMapAsync(
        this.strategies,
        async (strategy) => {
          try {
            return await strategy.queryCookies(name, domain);
          } catch (error) {
            this.handleStrategyError(error, strategy);
            return [];
          }
        },
        [],
      );
    } catch (error) {
      /**
       * Handle top-level errors that may occur during strategy processing
       * This ensures the function always returns an array, even in catastrophic failure
       */
      if (error instanceof Error) {
        this.logger.error("Failed to query cookies", { error });
      } else {
        this.logger.error("Failed to query cookies with unknown error", {
          error: String(error),
        });
      }
      return [];
    }
  }
}
