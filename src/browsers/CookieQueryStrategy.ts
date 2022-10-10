import { ExportedCookie } from "../ExportedCookie";

export default interface CookieQueryStrategy {
  queryCookies(name: string, domain: string): Promise<ExportedCookie[]>;
}
