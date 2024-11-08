import CookieRow from "../CookieRow";
import fs from "fs";
import { merge } from "lodash";
import SqliteAdapter from "../db/SqliteAdapter";

interface FnOptions {
  file: string;
  sql: string;
  rowFilter?: (row: any) => boolean;
  rowTransform: (row: any) => CookieRow;
}

async function checkFileExistence(file: string): Promise<void> {
  if (!file || !fs.existsSync(file))
    throw new Error(`File ${file} does not exist`);
}

async function transformRows(
  rows: any[],
  rowFilter: (row: any) => boolean,
  rowTransform: (row: any) => CookieRow,
  file: string,
): Promise<CookieRow[]> {
  const filteredRows = rows.filter(rowFilter);
  const transformedRows = filteredRows.map((row) =>
    merge({ meta: { file } }, rowTransform(row)),
  );
  return transformedRows;
}

export async function querySqliteThenTransform({
  file,
  sql,
  rowFilter = () => true,
  rowTransform,
}: FnOptions): Promise<CookieRow[]> {
  await checkFileExistence(file);
  const db = new SqliteAdapter(file);

  try {
    const result = await db.query(sql);
    const rows: any[] = await result.all();
    if (!rows || rows.length === 0) return [];

    return await transformRows(rows, rowFilter, rowTransform, file);
  } catch (err: any) {
    throw err;
  } finally {
    await db.close();
  }
}
