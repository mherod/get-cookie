import { Cookie, MemoryCookieStore, Store } from "tough-cookie";
import { existsSync, readFileSync, writeFile } from "fs";
import destr from "destr";
import { merge } from "lodash";

export class FileCookieStore extends Store {
  private readonly internalStore: Store;

  synchronous: boolean = false;
  filePath: string;

  private tasks: Promise<any>[] = [];

  constructor(
    filePath: string,
    internalStore: Store = new MemoryCookieStore()
  ) {
    super();

    this.filePath = filePath;
    this.internalStore = internalStore ?? new MemoryCookieStore();

    console.log("Importing cookies from", filePath, internalStore);

    this.tasks.push(
      this.importSaved(filePath, internalStore).then(console.log, console.error)
    );
  }

  private async importSaved(filePath: string, store: Store): Promise<Cookie[]> {
    const cookies: Cookie[] = [];
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, "utf8");
      const cookies: any[] = Object.values(destr(data))
        .flatMap((domainCookies: any) => Object.values(domainCookies))
        .flatMap((domainCookies: any) => Object.values(domainCookies));
      console.log("Importing", cookies.length, "cookies");
      const array = Array.isArray(cookies) ? cookies : Object.values(cookies);
      const put = await Promise.all(
        array.map((cookie) => {
          const fromJSON = Cookie.fromJSON(cookie);
          if (fromJSON) {
            return this.putCookieInternal(fromJSON, store);
          }
        })
      );
      cookies.push(...put);
    }
    return cookies;
  }

  findCookie(
    domain: string,
    path: string,
    key: string,
    cb: (err: Error | null, cookie: Cookie | null) => void
  ) {
    this.waitUntilIdle().finally(() => {
      this.internalStore.findCookie(domain, path, key, cb);
    });
  }

  findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain: boolean,
    cb: (err: Error | null, cookie: Cookie[]) => void
  ) {
    this.waitUntilIdle().finally(() => {
      this.internalStore.findCookies(domain, path, allowSpecialUseDomain, cb);
    });
  }

  putCookie(cookie: Cookie, cb: (err: Error | null) => void) {
    this.internalStore.putCookie(cookie, cb);
    this.internalStore.getAllCookies((err, cookies) => {
      this.serializeCallback(err, cookies);
    });
  }

  updateCookie(
    oldCookie: Cookie,
    newCookie: Cookie,
    cb: (err: Error | null) => void
  ) {
    this.internalStore.updateCookie(oldCookie, newCookie, cb);
    this.internalStore.getAllCookies((err, cookies) => {
      this.serializeCallback(err, cookies);
    });
  }

  removeCookie(
    domain: string,
    path: string,
    key: string,
    cb: (err: Error | null) => void
  ) {
    this.internalStore.removeCookie(domain, path, key, cb);
    this.internalStore.getAllCookies((err, cookies) => {
      this.serializeCallback(err, cookies);
    });
  }

  removeCookies(domain: string, path: string, cb: (err: Error | null) => void) {
    this.internalStore.removeCookies(domain, path, cb);
    this.internalStore.getAllCookies((err, cookies) => {
      this.serializeCallback(err, cookies);
    });
  }

  getAllCookies(cb: (err: Error | null, cookie: Cookie[]) => void) {
    this.waitUntilIdle().finally(() => {
      this.internalStore.getAllCookies(cb);
    });
  }

  waitUntilIdle() {
    return Promise.allSettled(this.tasks).catch(console.error);
  }

  private async putCookieInternal(
    cookie: Cookie,
    store: Store
  ): Promise<Cookie> {
    await this.waitUntilIdle();
    return await new Promise<Cookie>(
      (
        resolve: (value: PromiseLike<Cookie> | Cookie) => void,
        reject: (reason?: any) => void
      ) => {
        store.putCookie(cookie, (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve(cookie);
          }
        });
      }
    );
  }

  private serializeCallback(err: Error | null, cookies: Cookie[]) {
    if (err) {
      console.error(err);
      return;
    }
    const cookieObjs = cookies.map((cookie: Cookie) => cookie);
    const idx: any = {};
    for (const cookie of cookieObjs) {
      const domain = cookie.domain;
      if (typeof domain === "string") {
        const path: string = cookie.path ?? "/";
        const key: string = cookie.key;
        merge(idx, {
          [domain]: {
            [path]: {
              [key]: cookie.toJSON(),
            },
          },
        });
      }
    }
    const stringify = JSON.stringify(idx, null, 2);
    writeFile(this.filePath, stringify, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
}
