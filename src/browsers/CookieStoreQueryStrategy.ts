import CookieQueryStrategy from "./CookieQueryStrategy";
import CookieSpec from "../CookieSpec";
import ExportedCookie from "../ExportedCookie";
import { Cookie, Store } from "tough-cookie";
import { cookieJarPromise, cookieStorePromise } from "../CookieStore";
import { stringToRegex } from "../StringToRegex";

export default class CookieStoreQueryStrategy implements CookieQueryStrategy {
  browserName: string = "internal";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const exportedCookies: ExportedCookie[] = await this.getAllExportedCookies(name, domain);

    const wildcardRegexp: RegExp = /^([*%])$/i;
    if (name.match(wildcardRegexp) && domain.match(wildcardRegexp)) {
      return exportedCookies;
    }

    if (domain !== "%") {
      const domainCookies: ExportedCookie[] = await this.getDomainCookies(name, domain);
      exportedCookies.push(...domainCookies);
    }

    return this.filterCookies(exportedCookies, name, domain);
  }

  private async getAllExportedCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const cookies: Cookie[] = await this.getAllCookies();
    return cookies.map((cookie: Cookie) => this.extractCookie(cookie, { name, domain }));
  }

  private async getDomainCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const path: string = "/";
    const domain1: string = domain.match(/(\w+.+\w+)/gi)?.pop() ?? domain;
    const url: URL = new URL("https://" + domain1);
    url.pathname = path;
    const cookies: Cookie[] = await this.getCookies(url.href);
    return cookies.map((cookie: Cookie) => this.extractCookie(cookie, { domain, name }));
  }

  private filterCookies(exportedCookies: ExportedCookie[], name: string, domain: string): ExportedCookie[] {
    if (name === "%") {
      return exportedCookies.filter((cookie: ExportedCookie) => cookie.domain.match(stringToRegex(domain)));
    }

    return exportedCookies.filter(
      (cookie: ExportedCookie) =>
        cookie.name.match(stringToRegex(name)) &&
        cookie.domain.match(stringToRegex(domain)),
    );
  }

  private extractCookie(cookie: Cookie, cookieSpec: CookieSpec): ExportedCookie {
    return {
      domain: cookie.domain ?? cookieSpec.domain,
      name: cookie.key ?? cookieSpec.name,
      value: cookie.value,
      expiry: cookie.expires ?? "Infinity",
      meta: {
        file: "tough-cookie",
      },
    };
  }

  private async getCookies(url: string): Promise<Cookie[]> {
    const cookieJar = await cookieJarPromise;
    return new Promise((resolve, reject) => {
      cookieJar.getCookies(url, (err: Error | null, cookies: Cookie[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(cookies ?? []);
        }
      });
    });
  }

  private async getAllCookies(): Promise<Cookie[]> {
    const cookieStore: Store = await cookieStorePromise;
    return new Promise((resolve, reject) => {
      cookieStore.getAllCookies((err: Error | null, cookies: Cookie[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(cookies ?? []);
        }
      });
    });
  }
}
