import { groupBy } from "lodash";
import { resultsRendered } from "./resultsRendered";
import { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";

export async function getGroupedRenderedCookies(
  cookieSpec: MultiCookieSpec,
): Promise<string[]> {
  const cookies: ExportedCookie[] = await fetchCookies(cookieSpec);
  const groupedByFile = groupCookiesByFile(cookies);
  return renderGroupedCookies(groupedByFile);
}

async function fetchCookies(cookieSpec: MultiCookieSpec): Promise<ExportedCookie[]> {
  const cookies: ExportedCookie[] = await comboQueryCookieSpec(cookieSpec);
  if (cookies.length === 0) {
    throw new Error("Cookie not found");
  }
  return cookies;
}

function groupCookiesByFile(cookies: ExportedCookie[]): Record<string, ExportedCookie[]> {
  return groupBy(cookies, (r: ExportedCookie) => r.meta?.file);
}

function renderGroupedCookies(groupedByFile: Record<string, ExportedCookie[]>): string[] {
  const renderedResults: string[] = [];
  for (const file in groupedByFile) {
    if (groupedByFile.hasOwnProperty(file)) {
      const results: ExportedCookie[] = groupedByFile[file];
      renderedResults.push(resultsRendered(results));
    }
  }
  return renderedResults;
}
