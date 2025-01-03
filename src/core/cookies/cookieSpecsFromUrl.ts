import type { CookieSpec } from "../../types/schemas";

/**
 * Process a domain into cookie specifications, including parent domains
 * @internal
 * @param domain - The domain to process (e.g., 'api.example.com')
 * @returns Array of cookie specifications for the domain and its parents
 */
function processDomainsIntoCookieSpecs(domain: string): CookieSpec[] {
  const parts = domain.split(".");
  const cookieSpecs: CookieSpec[] = [];

  /**
   * Add the full domain first to ensure exact matches are prioritized
   * The '%' wildcard in the name field matches any cookie name for this domain
   */
  cookieSpecs.push({
    name: "%",
    domain: domain,
  });

  /**
   * Add parent domains to support domain-level cookie matching
   * For example, for 'sub.example.com', we also want to match 'example.com'
   * This is important because cookies can be set at parent domain levels
   */
  for (let i = 1; i < parts.length - 1; i++) {
    const subDomain = parts.slice(i).join(".");
    cookieSpecs.push({
      name: "%",
      domain: subDomain,
    });
  }

  return cookieSpecs;
}

/**
 * Generate cookie specifications from a URL by creating specs for both the exact domain
 * and its parent domains. This allows for proper cookie matching across domain levels.
 * @param url - The URL to generate cookie specs from (e.g., 'https://example.com' or just 'example.com')
 * @returns An array of cookie specifications for the URL and its parent domains
 * @remarks
 * - If the URL is provided without a protocol, it will first try to parse with 'https://' prefix
 * - If parsing fails, it will treat the input as a plain domain name
 * - The function handles invalid URLs gracefully by treating them as domain names
 * - The '%' wildcard is used for the name to match all cookies for the domain
 * @example
 * ```typescript
 * // Basic URL with protocol
 * cookieSpecsFromUrl('https://example.com')
 * // Returns: [{ name: '%', domain: 'example.com' }]
 *
 * // URL with subdomain
 * cookieSpecsFromUrl('https://api.example.com')
 * // Returns: [
 * //   { name: '%', domain: 'api.example.com' },
 * //   { name: '%', domain: 'example.com' }
 * // ]
 *
 * // Domain without protocol (automatically handled)
 * cookieSpecsFromUrl('example.com')
 * // Returns: [{ name: '%', domain: 'example.com' }]
 * ```
 */
export function cookieSpecsFromUrl(url: string): CookieSpec[] {
  // For URLs without protocol, try adding https://
  if (!url.includes("://")) {
    try {
      return cookieSpecsFromUrl(`https://${url}`);
    } catch {
      // If adding protocol fails, treat as domain name
      return [
        {
          name: "%",
          domain: url,
        },
      ];
    }
  }

  try {
    const urlObj = new URL(url);
    return processDomainsIntoCookieSpecs(urlObj.hostname);
  } catch (_error) {
    /**
     * Fallback handling for any parsing errors
     * This ensures the function remains robust even with invalid input
     * Returns a single spec treating the entire input as a domain name
     */
    return [
      {
        name: "%",
        domain: url,
      },
    ];
  }
}
