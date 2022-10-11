import CookieRow from "./CookieRow";

export interface DoSqliteQuery1Params {
  file: string;
  sql: string;
  rowTransform: (row: any) => CookieRow;
}
