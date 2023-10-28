export default interface ExportedCookie {
  domain: string;
  name: string;
  value: string;
  expiry?: Date | "Infinity";
  meta?: any;
}

export function isExportedCookie(obj: any): obj is ExportedCookie {
  return (
    typeof obj.domain === "string" &&
    typeof obj.name === "string" &&
    typeof obj.value === "string" &&
    (obj.expiry === undefined ||
      obj.expiry instanceof Date ||
      obj.expiry === "Infinity") &&
    (obj.meta === undefined || typeof obj.meta === "object")
  );
}
