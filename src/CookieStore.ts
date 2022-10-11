import { CookieJar } from "tough-cookie";
import { env } from "./global";
const { FileCookieStore } = require("tough-cookie-file-store");

export const cookieStore = new FileCookieStore(
  `${env["HOME"]}/cookie-star.json`
);
// export const cookieStore = new MemoryCookieStore();

export const cookieJar = new CookieJar(cookieStore);
