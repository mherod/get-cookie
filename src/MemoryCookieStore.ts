import { CookieJar, MemoryCookieStore } from "tough-cookie";

export const memoryCookieStore = new MemoryCookieStore();

export const cookieJar = new CookieJar(memoryCookieStore);
