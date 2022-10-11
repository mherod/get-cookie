import * as fs from "fs";
import * as sqlite3 from "sqlite3";
import CookieRow from "./CookieRow";
import { merge } from "lodash";

interface DoSqliteQuery1Params {
  file: string;
  sql: string;
  rowTransform: (row: any) => CookieRow;
}

export async function doSqliteQuery1({
  file,
  sql,
  rowTransform,
}: DoSqliteQuery1Params): Promise<CookieRow[]> {
  if (!file || (file && !fs.existsSync(file))) {
    throw new Error(`doSqliteQuery1: file ${file} does not exist`);
  }
  const db = new sqlite3.Database(file);
  return new Promise((resolve, reject) => {
    db.all(sql, (err: Error, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      const rows1: any[] = rows;
      if (rows1 == null || rows1.length === 0) {
        resolve([]);
        return;
      }
      if (Array.isArray(rows1)) {
        const cookieRows: CookieRow[] = rows1.map((row: any) => {
          const newVar = {
            meta: {
              file: file,
            },
          };
          const cookieRow: CookieRow = rowTransform(row);
          return merge(newVar, cookieRow);
        });
        resolve(cookieRows);
        return;
      }
      if (process.env.VERBOSE) {
        console.log(`doSqliteQuery1: rows ${JSON.stringify(rows1)}`);
      }
      resolve([rows1]);
    });
  });
}
