import { env } from "./global";
import { parsedArgs } from "./argv";
import { CookieJar, MemoryCookieStore, Store } from "tough-cookie";

import { FileCookieStore } from "./FileCookieStore";

const memoryCookieStore = new MemoryCookieStore();

async function getCookieStore(): Promise<Store> {
  if (parsedArgs["cs"] == "memory") {
    return memoryCookieStore;
  }
  const fileCookieStore = new FileCookieStore(
    `${env["HOME"]}/cookie-star.json`,
    memoryCookieStore,
  );
  await fileCookieStore.waitUntilIdle();
  return fileCookieStore;
}

export const cookieStorePromise: Promise<Store> = new Promise((resolve) => {
  getCookieStore().then(resolve);
});

export const cookieJarPromise: Promise<CookieJar> = new Promise((resolve) => {
  cookieStorePromise.then((store) => new CookieJar(store)).then(resolve);
});
