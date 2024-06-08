import { chromeApplicationSupport } from "./chrome/ChromeApplicationSupport";
import { querySqliteThenTransform } from "./QuerySqliteThenTransform";
import { existsSync } from "fs";
import { join } from "path";
import { parsedArgs } from "../argv";
import { stringToRegex } from "../StringToRegex";
import CookieRow from "../CookieRow";
import consola from "../logger";

interface GetEncryptedChromeCookieParams {
  name: string;
  domain: string;
  file?: string;
}

interface SqlQueryBuilderInterface {
  build(): string;
  addCondition(field: string, value: string, operator?: string): void;
}

class SqlQueryBuilder implements SqlQueryBuilderInterface {
  private baseQuery: string;
  private conditions: string[];

  constructor(
    baseQuery: string = "SELECT encrypted_value, name, host_key, expires_utc FROM cookies",
  ) {
    this.baseQuery = baseQuery;
    this.conditions = [];
  }

  addCondition(field: string, value: string, operator: string = "="): void {
    const wildcardRegexp = /^([*%])$/i;
    if (!wildcardRegexp.test(value)) {
      const condition = `${field} ${operator} '${value}'`;
      this.conditions.push(condition);
    }
  }

  build(): string {
    let sql = this.baseQuery;
    if (this.conditions.length > 0) {
      sql += ` WHERE ${this.conditions.join(" AND ")}`;
    }
    return sql;
  }
}

interface LoggerInterface {
  log(file: string, name: string, domain: string, sql: string): void;
}

class VerboseLogger implements LoggerInterface {
  log(file: string, name: string, domain: string, sql: string): void {
    if (parsedArgs.verbose) {
      const s = file.split("/").slice(-3).join("/");
      consola.start(
        `Trying Chrome (at ${s}) cookie ${name} for domain ${domain}`,
      );
    }
  }
}

interface RowTransformerInterface {
  transform(row: any): CookieRow;
}

class RowTransformer implements RowTransformerInterface {
  transform(row: any): CookieRow {
    const cookieRow: CookieRow = {
      expiry: (row["expires_utc"] / 1000000 - 11644473600) * 1000,
      domain: row["host_key"],
      name: row["name"],
      value: row["encrypted_value"],
    };
    return cookieRow;
  }
}

export async function getEncryptedChromeCookie({
  name,
  domain,
  file = join(chromeApplicationSupport, "Default", "Cookies"),
}: GetEncryptedChromeCookieParams): Promise<CookieRow[]> {
  if (!existsSync(file)) {
    throw new Error(`File ${file} does not exist`);
  }

  const sqlQueryBuilder: SqlQueryBuilderInterface = new SqlQueryBuilder();
  sqlQueryBuilder.addCondition("name", name);
  const wildcardDomain = /[%*]/.test(domain);
  if (!wildcardDomain) {
    const sqlEmbedDomain = domain.replace(/^[.%]?/, "%");
    sqlQueryBuilder.addCondition("host_key", sqlEmbedDomain, "LIKE");
  }
  const sql: string = sqlQueryBuilder.build();

  const verboseLogger: LoggerInterface = new VerboseLogger();
  verboseLogger.log(file, name, domain, sql);

  const domainRegexp: RegExp = stringToRegex(domain);
  const rowTransformer: RowTransformerInterface = new RowTransformer();
  let sqliteQuery1: CookieRow[];
  try {
    sqliteQuery1 = await querySqliteThenTransform({
      file: file,
      sql: sql,
      rowFilter: (row) => {
        return row["host_key"].match(domainRegexp) != null;
      },
      rowTransform: rowTransformer.transform.bind(rowTransformer),
    });
  } catch (error) {
    throw error;
  }

  const filteredResults = sqliteQuery1.filter((row) => {
    return row.domain.match(domainRegexp) != null;
  });

  return filteredResults;
}
