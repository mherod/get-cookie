import type { ExportedCookie } from "./ExportedCookie";

/**
 * Interface for implementing browser-specific cookie query strategies.
 * This interface defines the contract for querying cookies from different browser implementations.
 */
export interface CookieQueryStrategy {
  /**
   * The name of the browser this strategy is implemented for
   */
  browserName: string;

  /**
   * Query cookies from the browser's storage
   * @param name - The name of the cookie to query
   * @param domain - The domain to query cookies from
   * @returns A promise that resolves to an array of exported cookies
   */
  queryCookies(name: string, domain: string): Promise<Array<ExportedCookie>>;
}
