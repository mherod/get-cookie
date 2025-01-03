import { CookieJar } from "tough-cookie";

const cookieJar = new CookieJar();

/**
 * Promise that resolves to a CookieJar instance for handling cookie operations
 */
export const cookieJarPromise = Promise.resolve(cookieJar);

/**
 * Promise that resolves to a CookieJar instance for cookie storage operations
 */
export const cookieStorePromise = Promise.resolve(cookieJar);

