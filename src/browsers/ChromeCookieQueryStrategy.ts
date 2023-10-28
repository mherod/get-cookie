import CookieQueryStrategy from "./CookieQueryStrategy";
import { env } from "../global";
import { existsSync } from "fs";
import { findAllFiles } from "../findAllFiles";
import { join } from "path";
import { merge } from "lodash";
import { isCookieRow } from "../IsCookieRow";
import { isExportedCookie } from "../ExportedCookie";
import CookieRow from "../CookieRow";
import ExportedCookie from "../ExportedCookie";
import { stringToRegex } from "../StringToRegex";
import { parsedArgs } from "../argv";
import consola from "consola";
import { getChromePassword } from "./getChromePassword";
import { chromeApplicationSupport } from "./ChromeApplicationSupport";
import { decrypt } from "./decrypt";
import { doSqliteQueryWithTransform } from "./DoSqliteQueryWithTransform";

export default class ChromeCookieQueryStrategy implements CookieQueryStrategy {
  browserName = "Chrome";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    if (process.platform !== "darwin") {
      throw new Error("This only works on macOS");
    }
    if (env.FIREFOX_ONLY) {
      return [];
    }
    return getChromeCookies({
      requireJwt: false,
      name,
      domain,
    });
  }
}

async function getPromise1(
  name: string,
  domain: string,
  file: string
): Promise<CookieRow[]> {
  try {
    return await getEncryptedChromeCookie({
      name: name,
      domain: domain,
      file: file,
    });
  } catch (e) {
    if (parsedArgs.verbose) {
      console.log("Error getting encrypted cookie", e);
    }
    return [];
  }
}

async function getPromise(name: string, domain: string): Promise<CookieRow[]> {
  try {
    const files: string[] = await findAllFiles({
      path: chromeApplicationSupport,
      name: "Cookies",
    });
    const promises: Promise<CookieRow[]>[] = files.map((file) =>
      getPromise1(name, domain, file)
    );
    const results1: CookieRow[][] = await Promise.all(promises);
    return results1.flat().filter(isCookieRow);
  } catch (error) {
    if (parsedArgs.verbose) {
      console.log("error", error);
    }
    return [];
  }
}

async function decryptValue(password: string, encryptedValue: Buffer) {
  let d: string | null;
  try {
    d = await decrypt(password, encryptedValue);
  } catch (e) {
    if (parsedArgs.verbose) {
      console.log("Error decrypting cookie", e);
    }
    d = null;
  }
  return d ?? encryptedValue.toString("utf-8");
}

async function getChromeCookies({
  name,
  domain = "%",
  requireJwt = false,
}: {
  name: string;
  domain: string;
  requireJwt: boolean | undefined;
  //
}): //
Promise<ExportedCookie[]> {
  const encryptedDataItems: CookieRow[] = await getPromise(name, domain);
  const password: string = await getChromePassword();
  const decrypted: Promise<ExportedCookie | null>[] = encryptedDataItems
    .filter(({ value }) => value != null && value.length > 0)
    .map(async (cookieRow: CookieRow) => {
      const encryptedValue: Buffer = cookieRow.value;
      const decryptedValue = await decryptValue(password, encryptedValue);
      const meta = {};
      merge(meta, cookieRow.meta ?? {});
      const exportedCookie: ExportedCookie = {
        domain: cookieRow.domain,
        name: cookieRow.name,
        value: decryptedValue,
        meta: meta,
      };
      const expiry = cookieRow.expiry;
      const mergeExpiry =
        expiry != null && expiry > 0
          ? {
              expiry: new Date(expiry),
            }
          : {
              expiry: "Infinity",
            };
      merge(exportedCookie, mergeExpiry);
      return exportedCookie;
    });
  const results: ExportedCookie[] = (await Promise.all(decrypted)).filter(
    isExportedCookie
  );
  if (parsedArgs.verbose) {
    console.log("results", results);
  }
  return results;
}

async function getEncryptedChromeCookie({
  name,
  domain,
  file = join(chromeApplicationSupport, "Default", "Cookies"),
}: //
{
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
      `Trying Chrome (at ${s}) cookie ${name} for domain ${domain}`
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
  const sqliteQuery1: CookieRow[] = await doSqliteQueryWithTransform({
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
