export default interface CookieRow {
  expiry?: number;
  domain: string;
  name: string;
  value: Buffer;
  meta?: any;
}
