import { orderBy, uniqBy } from "lodash";
import ExportedCookie from "./ExportedCookie";

function sortResults(results: ExportedCookie[]): ExportedCookie[] {
  return orderBy(results, ["name", "expiry"], ["asc", "desc"]);
}

function getUniqueResults(results: ExportedCookie[]): ExportedCookie[] {
  return uniqBy(results, "name");
}

function formatResults(results: ExportedCookie[]): string {
  const resultStrings: string[] = [];
  for (const result of results) {
    resultStrings.push(`${result.name}=${result.value}`);
  }
  return resultStrings.join("; ");
}

export function resultsRendered(results: ExportedCookie[]): string {
  const orderedResults: ExportedCookie[] = sortResults(results);
  const uniqueResults: ExportedCookie[] = getUniqueResults(orderedResults);
  return formatResults(uniqueResults);
}