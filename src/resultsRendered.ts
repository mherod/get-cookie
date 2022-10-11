import { orderBy, uniqBy } from "lodash";
import ExportedCookie from "./ExportedCookie";

export function resultsRendered(results: ExportedCookie[]) {
  // sort by name and expiry descending
  // takes the latest expiry for each name
  const orderedResults = orderBy(results, ["name", "expiry"], ["asc", "desc"]);
  return uniqBy(orderedResults, (r: ExportedCookie) => r.name)
    .map((r: ExportedCookie) => r.name + "=" + r.value)
    .join("; ");
}
