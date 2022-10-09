import ExportedCookie from "./ExportedCookie";
import { uniqBy } from "lodash";

export function resultsRendered(results: ExportedCookie[]) {
  return uniqBy(results, (r) => r.name)
    .map((r) => r.name + "=" + r.value)
    .join("; ");
}
