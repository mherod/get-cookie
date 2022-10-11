import ExportedCookie from "../ExportedCookie";
import CookieQueryStrategy from "./CookieQueryStrategy";
import { Cookie } from "tough-cookie";
import CookieSpec from "../CookieSpec";
import { memoryCookieStore } from "../MemoryCookieStore";

export default class MemoryCookieStoreQueryStrategy
  implements CookieQueryStrategy
{
  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    if (name == "%" && domain == "%") {
      const cookies: Cookie[] = await memoryCookieStore.getAllCookies();
      return cookies.map((cookie) => {
        return this.#extracted(cookie, { name, domain });
      });
    }

    const path = "/";

    if (name == "%") {
      const cookies: Cookie[] = await memoryCookieStore.findCookies(
        domain,
        path
      );
      return cookies.map((cookie) => {
        return this.#extracted(cookie, { name, domain });
      });
    }

    const cookie: Cookie | null = await memoryCookieStore.findCookie(
      domain,
      path,
      name
    );

    if (cookie) {
      return [this.#extracted(cookie, { name, domain })];
    } else {
      return [];
    }
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
}
