import type { CookieSpec } from "../../types/CookieSpec";

/**
 * Generate cookie specifications from a URL
 * Creates cookie specs for both the exact domain and its parent domains
 * @param url - The URL to generate cookie specs from
 * @returns An array of cookie specifications for the URL and its parent domains
 * @throws {Error} If the URL is invalid
 */
export function cookieSpecsFromUrl(url: string): CookieSpec[] {
  if (!url) {
    return [];
  }

  try {
    const cookieSpecs: CookieSpec[] = [];
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const parts = domain.split('.');

    // Add exact domain match
    cookieSpecs.push({
      name: "%",
      domain: domain,
    });

    // Generate specs for each subdomain level
    for (let i = 1; i < parts.length - 1; i++) {
      // Add wildcard for current level
      cookieSpecs.push({
        name: "%",
        domain: `%.${parts.slice(i).join('.')}`,
      });

      // Add exact domain for current level
      cookieSpecs.push({
        name: "%",
        domain: parts.slice(i).join('.'),
      });
    }

    return cookieSpecs;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Invalid URL");
    }
    throw error;
  }
}
