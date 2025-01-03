import { CookieJar } from "tough-cookie";

const cookieJar = new CookieJar();

/**
 * Promise that resolves to a CookieJar instance for handling cookie operations
 *
 * @example
 * // Wait for cookie jar to be ready
 * const jar = await cookieJarPromise;
 *
 * // Store a cookie
 * await jar.setCookie('session=abc123; Domain=example.com', 'https://example.com');
 *
 * // Retrieve cookies
 * const cookies = await jar.getCookies('https://example.com');
 * console.log(cookies[0].toString()); // 'session=abc123'
 */
export const cookieJarPromise = Promise.resolve(cookieJar);

/**
 * Promise that resolves to a CookieJar instance for cookie storage operations
 *
 * @example
 * // Wait for cookie store to be ready
 * const store = await cookieStorePromise;
 *
 * // Store multiple cookies
 * await store.setCookie('auth=token123; Domain=api.example.com', 'https://api.example.com');
 * await store.setCookie('theme=dark; Domain=example.com', 'https://example.com');
 *
 * // Get all cookies for a domain
 * const cookies = await store.getCookies('https://example.com');
 * for (const cookie of cookies) {
 *   console.log(cookie.key, '=', cookie.value);
 * }
 */
export const cookieStorePromise = Promise.resolve(cookieJar);
