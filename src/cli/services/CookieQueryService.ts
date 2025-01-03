import type { CookieSpec, ExportedCookie } from "../../types/schemas";
import type { CookieQueryStrategy } from "./CookieStrategyFactory";

/**
 * Service class for querying cookies with limits
 */
export class CookieQueryService {
  public constructor(private readonly strategy: CookieQueryStrategy) {}

  /**
   * Queries cookies from the strategy with an optional limit
   * @param specs - List of cookie specifications to query
   * @param limit - Optional maximum number of cookies to return
   * @returns List of cookies matching the specifications
   * @example
   * // Query cookies with a limit of 10
   * const cookies = await queryService.queryCookiesWithLimit(specs, 10);
   */
  public async queryCookiesWithLimit(
    specs: CookieSpec[],
    limit?: number
  ): Promise<ExportedCookie[]> {
    const results: ExportedCookie[] = [];

    for (const spec of specs) {
      const cookies = await this.strategy.queryCookies(spec.name, spec.domain);
      if (typeof limit === "number" && limit > 0 && results.length + cookies.length > limit) {
        results.push(...cookies.slice(0, limit - results.length));
        break;
      }
      results.push(...cookies);
    }

    return results;
  }
}
