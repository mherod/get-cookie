import { env } from "./global";
import { parsedArgs } from "./argv";
import { CookieJar, MemoryCookieStore, Store } from "tough-cookie";

const { FileCookieStore } = require("tough-cookie-file-store");

export let cookieStore: Store;
if (parsedArgs["cs"] == "memory") {
  cookieStore = new MemoryCookieStore();
} else {
  cookieStore = new FileCookieStore(`${env["HOME"]}/cookie-star.json`);
}

export const cookieJar = new CookieJar(cookieStore);
