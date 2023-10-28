import CookieRow from "../CookieRow";
import fs from "fs";
import { Database } from "sqlite3";
import { merge } from "lodash";
import { parsedArgs } from "../argv";
import consola from "consola";

export interface DoSqliteQueryWithTransformOptions {
  file: string;
  sql: string;
  rowFilter?: (row: any) => boolean;
  rowTransform: (row: any) => CookieRow;
}

function checkFileExistence(file: string) {
  if (!file || !fs.existsSync(file)) {
    throw new Error(`File ${file} does not exist`);
  }
}

function createDatabase(file: string) {
  return new Database(file);
}

function transformRows(
  //
  rows: any[],
  rowFilter: (row: any) => boolean,
  rowTransform: (row: any) => CookieRow,
  file: string
  //
): CookieRow[] {
  return rows.filter(rowFilter).map((row: any) => {
    const metaData = {
      meta: {
        file: file,
      },
    };

    const cookieRow: CookieRow = rowTransform(row);

    return merge(metaData, cookieRow);
  });
}

export async function doSqliteQueryWithTransform(
  //
  {
    //
    file,
    sql,
    rowFilter = () => true,
    rowTransform,
  }: DoSqliteQueryWithTransformOptions
): //
Promise<CookieRow[]> {
  checkFileExistence(file);

  const db: Database = createDatabase(file);

  return new Promise((resolve, reject) => {
    db.all(sql, (err: Error, rows: any[]) => {
      if (err) {
        return reject(err);
      }

      if (!rows || rows.length === 0) {
        return resolve([]);
      }

      const cookieRows: CookieRow[] = transformRows(
        rows,
        rowFilter,
        rowTransform,
        file
      );

      if (parsedArgs.verbose) {
        consola.log(`Rows: ${JSON.stringify(rows)}`);
      }

      return resolve(cookieRows);
    });
  });
}
