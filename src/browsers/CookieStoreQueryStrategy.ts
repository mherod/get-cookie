import CookieQueryStrategy from "./CookieQueryStrategy";
import CookieSpec from "../CookieSpec";
import ExportedCookie from "../ExportedCookie";
import { Cookie } from "tough-cookie";
import { cookieStore, cookieJar } from "../CookieStore";
import { stringToRegex } from "../StringToRegex";

export default class CookieStoreQueryStrategy implements CookieQueryStrategy {
  browserName = "internal";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const exportedCookies: ExportedCookie[] = [];

    if (name.match(/[%*]/) || domain.match(/[%*]/)) {
      const cookies: Cookie[] = await this.#getAllCookies();
      const allExportedCookies = cookies.map((cookie: Cookie) => {
        return this.#extracted(cookie, { name, domain });
      });
      exportedCookies.push(...allExportedCookies);
    }

    if (name == "%" && domain == "%") {
      return exportedCookies;
    }

    const path = "/";

    if (domain != "%") {
      const domain1 = domain.match(/(\w+.+\w+)/gi)?.pop() ?? domain;
      const url = new URL("https://" + domain1);
      url.pathname = path;
      const cookies: Cookie[] = await cookieJar.getCookies(url.href);
      const domainCookies = cookies.map((cookie: Cookie) => {
        return this.#extracted(cookie, {
          domain,
          name,
        });
      });
      exportedCookies.push(...domainCookies);
    }

    if (name == "%") {
      return exportedCookies;
    }

    const cookie: Cookie | null = await cookieStore.findCookie(
      domain,
      path,
      name
    );

    if (cookie) {
      const singleCookie = this.#extracted(cookie, { name, domain });
      return [singleCookie];
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
      meta: {
        file: "memory",
      },
    };
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
