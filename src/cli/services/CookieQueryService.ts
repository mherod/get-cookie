import type {
  CookieSpec,
  ExportedCookie,
  CookieQueryOptions,
} from "../../types/schemas";

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
   * Queries cookies from the strategy with options
   * @param spec - The cookie specification to query for
   * @param options - Query options including limit, removeExpired, and store path
   * @returns Array of exported cookies
   */
  public async queryCookies(
    spec: CookieSpec,
    options?: CookieQueryOptions,
  ): Promise<ExportedCookie[]> {
    return this.strategy.queryCookies(spec.name, spec.domain, options?.store);
  }
}
