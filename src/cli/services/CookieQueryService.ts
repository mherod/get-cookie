import type { CookieSpec, ExportedCookie } from "../../types/schemas";

import type { CookieQueryStrategy } from "./CookieStrategyFactory";

/**
 * Service for querying cookies using a strategy
 */
export class CookieQueryService {
  /**
   * Creates a new CookieQueryService instance
   * @param strategy - The strategy to use for querying cookies
   */
  public constructor(private readonly strategy: CookieQueryStrategy) {}

  /**
   * Queries cookies from the strategy with an optional limit
   * @param spec - The cookie specification to query for
   * @param _limit - Optional limit on the number of cookies to return (currently unused)
   * @returns Array of exported cookies
   */
  public async queryCookies(
    spec: CookieSpec,
    _limit?: number,
  ): Promise<ExportedCookie[]> {
    return this.strategy.queryCookies(spec.name, spec.domain);
  }
}
