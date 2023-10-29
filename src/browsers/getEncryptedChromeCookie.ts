import { chromeApplicationSupport } from "./chrome/ChromeApplicationSupport";
import { querySqliteThenTransform } from "./QuerySqliteThenTransform";
import { existsSync } from "fs";
import { join } from "path";
import { parsedArgs } from "../argv";
import { stringToRegex } from "../StringToRegex";
import CookieRow from "../CookieRow";
import consola from "../logger";

export async function getEncryptedChromeCookie({
  name,
  domain,
  file = join(chromeApplicationSupport, "Default", "Cookies"),
}: {
  name: string;
  domain: string;
  file: string;
}): Promise<CookieRow[]> {
  if (!existsSync(file)) {
    throw new Error(`File ${file} does not exist`);
  }
  if (parsedArgs.verbose) {
    const s = file.split("/").slice(-3).join("/");
    consola.start(
      `Trying Chrome (at ${s}) cookie ${name} for domain ${domain}`,
    );
  }
  let sql;
  //language=SQL
  sql = "SELECT encrypted_value, name, host_key, expires_utc FROM cookies";
  // Define a regular expression to match wildcard characters
  const wildcardRegexp = /^([*%])$/i;
  // Check if the name does not contain wildcard characters
  const specifiedName = name.match(wildcardRegexp) == null;
  // Check if the domain does not contain wildcard characters
  const specifiedDomain = domain.match(wildcardRegexp) == null;
  // Check if the domain contains wildcard characters
  const wildcardDomain = domain.match(/[%*]/) != null;
  // Determine if we should query the domain based on the previous checks
  const queryDomain = specifiedDomain && !wildcardDomain;
  // if we have a wildcard domain, we need to use a regexp
  // If the name is specified or we need to query the domain, we add a WHERE clause to the SQL query
  if (specifiedName || queryDomain) {
    sql += ` WHERE `;
    // If the name is specified, we add a condition to the SQL query to match the name
    if (specifiedName) {
      sql += `name = '${name}'`;
      // If we also need to query the domain, we add an AND operator to the SQL query
      if (queryDomain) {
        sql += ` AND `;
      }
    }
    // If we need to query the domain, we add a condition to the SQL query to match the domain
    if (queryDomain) {
      // The leading dot is replaced with % to match subdomains
      const sqlEmbedDomain = domain.replace(/^[.%]?/, "%");
      sql += `host_key LIKE '${sqlEmbedDomain}';`;
    }
  }
  if (parsedArgs.verbose) {
    consola.info("Querying:", sql);
  }
  const domainRegexp: RegExp = stringToRegex(domain);
  const sqliteQuery1: CookieRow[] = await querySqliteThenTransform({
    file: file,
    sql: sql,
    rowFilter: (row) => {
      return row["host_key"].match(domainRegexp) != null;
    },
    rowTransform: (row) => {
      const cookieRow = {
        expiry: (row["expires_utc"] / 1000000 - 11644473600) * 1000,
        domain: row["host_key"],
        name: row["name"],
        value: row["encrypted_value"],
      };
      if (parsedArgs.verbose) {
        consola.info("Found", cookieRow);
      }
      return cookieRow;
    },
  });
  return sqliteQuery1.filter((row) => {
    // TODO: is this needed?
    return row.domain.match(domainRegexp) != null;
  });
}
