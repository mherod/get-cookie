export default interface CookieRow {
  expiry?: number;
  domain: string;
  name: string;
  value: Buffer;
  meta?: any;
}

export function isCookieRow(obj: any): obj is CookieRow {
  return (
    obj.domain !== undefined &&
    obj.name !== undefined &&
    obj.value !== undefined
  );
}
