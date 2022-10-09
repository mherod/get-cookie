import { ExportedCookie } from "./ExportedCookie";

export function isExportedCookie(obj: any): obj is ExportedCookie {
  return obj.domain !== undefined && obj.name !== undefined && obj.value !== undefined;
}
