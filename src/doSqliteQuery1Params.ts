import CookieRow from "./CookieRow";

export interface DoSqliteQuery1Params {
  file: string;
  sql: string;
  rowFilter?: (row: any) => boolean;
  rowTransform: (row: any) => CookieRow;
}
