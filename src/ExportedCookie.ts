export default interface ExportedCookie {
  domain: string;
  name: string;
  value: string;
  expiry?: Date | "Infinity";
  meta?: any;
}
