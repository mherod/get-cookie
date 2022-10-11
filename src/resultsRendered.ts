import { uniqBy } from "lodash";
import ExportedCookie from "./ExportedCookie";

export function resultsRendered(results: ExportedCookie[]) {
  return uniqBy(results, (r) => r.name)
    .map((r) => r.name + "=" + r.value)
    .join("; ");
}
