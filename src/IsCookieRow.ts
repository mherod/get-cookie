import { CookieRow } from "./CookieRow";

export function isCookieRow(obj: any): obj is CookieRow {
  return (
    obj.domain !== undefined &&
    obj.name !== undefined &&
    obj.value !== undefined
  );
}
