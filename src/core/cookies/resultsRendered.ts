import type { ExportedCookie } from "../../types/ExportedCookie";

/**
 * Formats cookie query results for display.
 * @param cookies - The array of cookies to format
 * @param verbose - Whether to include detailed information
 * @returns A formatted string representation of the cookies
 */
export function resultsRendered(cookies: ExportedCookie[], verbose = false): string {
  if (cookies.length === 0) {
    return "No cookies found.";
  }

  const lines: string[] = [];
  lines.push(`Found ${cookies.length} cookie${cookies.length === 1 ? "" : "s"}:`);

  for (const cookie of cookies) {
    lines.push(`- ${cookie.name}=${cookie.value}`);
    if (verbose) {
      lines.push(`  Domain: ${cookie.domain}`);
      if (cookie.expiry !== undefined) {
        const expiry = typeof cookie.expiry === "number" || cookie.expiry === "Infinity"
          ? cookie.expiry
          : cookie.expiry.toISOString();
        lines.push(`  Expires: ${expiry}`);
      }
      if (cookie.meta) {
        lines.push(`  Metadata: ${JSON.stringify(cookie.meta, null, 2)}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Default export of the resultsRendered function
 */
export default resultsRendered;
