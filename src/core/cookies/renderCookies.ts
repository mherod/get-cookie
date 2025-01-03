import { groupBy } from "lodash";

import type { RenderOptions } from "../../types/CookieRender";
import type { ExportedCookie } from "../../types/ExportedCookie";

/**
 * Renders cookies as a string or array of strings
 * @param cookies - The cookies to render
 * @param options - Options for rendering
 * @returns A string for merged format, or array of strings for grouped format
 */
export function renderCookies(
  cookies: ExportedCookie[],
  options: RenderOptions = {}
): string | string[] {
  const {
    format = 'merged',
    showFilePaths = true,
    separator = '; '
  } = options;

  if (cookies.length === 0) {
    return format === 'merged' ? '' : [];
  }

  if (format === 'merged') {
    return cookies.map(c => c.value).join(separator);
  }

  const groupedByFile = groupBy(cookies, c => c.meta?.file ?? 'unknown');
  return Object.entries(groupedByFile).map(([file, fileCookies]) => {
    const values = fileCookies.map(c => c.value).join(separator);
    return showFilePaths ? `${file}: ${values}` : values;
  });
}
