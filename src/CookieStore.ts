import { CookieJar, Store } from "tough-cookie";

// Cast to any to access internal store property
export const cookieJarPromise: Promise<CookieJar> = Promise.resolve(new CookieJar());
export const cookieStorePromise: Promise<Store> = cookieJarPromise.then(jar => (jar as any).store);