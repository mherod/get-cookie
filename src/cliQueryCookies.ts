import CookieSpec from "./CookieSpec";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";
import logger from "./logger";
import { parsedArgs } from "./argv";
import { groupBy } from "lodash";
import { resultsRendered } from "./resultsRendered";
import ExportedCookie from "./ExportedCookie";
import { createConsola } from "consola";

const consola = createConsola({
  fancy: true,
  formatOptions: {
    colors: true,
    date: false,
  },
});
consola.wrapConsole();

export async function cliQueryCookies(
  cookieSpec: CookieSpec | CookieSpec[],
  limit?: number,
  removeExpired?: boolean,
  //
) {
  try {
    const results: ExportedCookie[] = await comboQueryCookieSpec(cookieSpec);
    if (results == null || results.length == 0) {
      consola.error("No results");
      return;
    }
    if (parsedArgs["dump"] || parsedArgs["d"]) {
      consola.log(results);
      return;
    }
    if (parsedArgs["dump-grouped"] || parsedArgs["D"]) {
      const groupedByFile = groupBy(results, (r) => r.meta?.file);
      consola.log(JSON.stringify(groupedByFile, null, 2));
      return;
    }
    if (
      parsedArgs["render"] ||
      parsedArgs["render-merged"] ||
      parsedArgs["r"]
    ) {
      consola.log(resultsRendered(results));
      return;
    }
    if (parsedArgs["render-grouped"] || parsedArgs["R"]) {
      const groupedByFile = groupBy(results, (r) => r.meta?.file);
      for (const file of Object.keys(groupedByFile)) {
        let results = groupedByFile[file];
        consola.log(file, ": ", resultsRendered(results));
      }
      return;
    }
    for (const result of results) {
      logger.log(result.value);
    }
  } catch (e) {
    logger.error(e);
  }
}
