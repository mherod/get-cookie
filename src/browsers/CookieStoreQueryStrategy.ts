import CookieQueryStrategy from "./CookieQueryStrategy";
import CookieSpec from "../CookieSpec";
import ExportedCookie from "../ExportedCookie";
import { Cookie } from "tough-cookie";
import { cookieJar, cookieStore } from "../CookieStore";
import { stringToRegex } from "../StringToRegex";

export default class CookieStoreQueryStrategy implements CookieQueryStrategy {
  browserName = "internal";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const exportedCookies: ExportedCookie[] = [];

    // if (name.match(/[%*]/) || domain.match(/[%*]/)) {
    const cookies: Cookie[] = await this.#getAllCookies();
    const allExportedCookies = cookies.map((cookie: Cookie) => {
      return this.#extracted(cookie, { name, domain });
    });
    exportedCookies.push(...allExportedCookies);
    // }

    const wildcardRegexp = /^([*%])$/i;
    if (name.match(wildcardRegexp) && domain.match(wildcardRegexp)) {
      return exportedCookies;
    }

    const path = "/";

    if (domain != "%") {
      const domain1 = domain.match(/(\w+.+\w+)/gi)?.pop() ?? domain;
      const url = new URL("https://" + domain1);
      url.pathname = path;
      const cookies: Cookie[] = await this.#getCookies(url.href);
      const domainCookies = cookies.map((cookie: Cookie) => {
        return this.#extracted(cookie, {
          domain,
          name,
        });
      });
      exportedCookies.push(...domainCookies);
    }

    if (name == "%") {
      return exportedCookies.filter((cookie: ExportedCookie) => {
        return cookie.domain.match(stringToRegex(domain));
      });
    }

    return exportedCookies.filter((cookie: ExportedCookie) => {
      return (
        cookie.name.match(stringToRegex(name)) &&
        cookie.domain.match(stringToRegex(domain))
      );
    });
  }

  #extracted(cookie: Cookie, cookieSpec: CookieSpec): ExportedCookie {
    return {
      domain: cookie.domain ?? cookieSpec.domain,
      name: cookie.key ?? cookieSpec.name,
      value: cookie.value,
      expiry: cookie.expires ?? Infinity,
      meta: {
        file: "tough-cookie",
      },
    };
  }

  #getCookies(url: string): Promise<Cookie[]> {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      return cookieJar.getCookies(url, (err, cookies) => {
        if (err) {
          reject(err);
        } else {
          resolve(cookies ?? []);
        }
      });
    });
  }

  #getAllCookies(): Promise<Cookie[]> {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      return cookieStore.getAllCookies((err, cookies) => {
        if (err) {
          reject(err);
        } else {
          resolve(cookies ?? []);
        }
      });
    });
  }
}
