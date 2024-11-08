import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";
import { groupBy } from "lodash";
import logger from "./logger";
import { parsedArgs } from "./argv";
import { resultsRendered } from "./resultsRendered";

export async function cliQueryCookies(
  cookieSpec: CookieSpec | CookieSpec[],
  limit?: number,
  removeExpired?: boolean,
) {
  try {
    const results: ExportedCookie[] = await comboQueryCookieSpec(cookieSpec, {
      limit,
      removeExpired,
    });

    if (!results || results.length === 0) {
      logger.error("No results");
      return;
    }

    if (parsedArgs.dump) {
      logger.log(results);
      return;
    }

    if (parsedArgs.dumpGrouped) {
      const groupedByFile = groupBy(results, (r) => r.meta?.file);
      logger.log(JSON.stringify(groupedByFile, null, 2));
      return;
    }

    if (parsedArgs.render || parsedArgs.renderMerged) {
      logger.log(resultsRendered(results));
      return;
    }

    if (parsedArgs.renderGrouped) {
      const groupedByFile = groupBy(results, (r) => r.meta?.file);
      for (const file of Object.keys(groupedByFile)) {
        const fileResults = groupedByFile[file];
        logger.log(`${file}: ${resultsRendered(fileResults)}`);
      }
      return;
    }

    if (parsedArgs.output === "json") {
      logger.log(JSON.stringify(results, null, 2));
      return;
    }

    for (const result of results) {
      logger.log(result.value);
    }
  } catch (e) {
    logger.error(e);
  }
}
