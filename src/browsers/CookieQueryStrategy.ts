import ExportedCookie from "../ExportedCookie";

export default interface CookieQueryStrategy {
  browserName: string;

  queryCookies(name: string, domain: string): Promise<ExportedCookie[]>;
}
