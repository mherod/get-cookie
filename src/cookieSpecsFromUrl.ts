import CookieSpec from "./CookieSpec";
import { uniqBy } from "lodash";
import consola from "consola";

export function cookieSpecsFromUrl(url: URL | string): CookieSpec[] {
  const url1 = typeof url == "string" ? new URL(url) : url;
  consola.start("cookieSpecsFromUrl", url1);
  const cookieSpecs = [];
  const splits = url1.hostname.split(".");
  const tld = splits.slice(-2).join(".");
  const cookieSpec: CookieSpec = {
    name: "%",
    domain: "%." + tld,
  };
  cookieSpecs.push(cookieSpec);
  const cookieSpec1: CookieSpec = {
    name: "%",
    domain: url1.hostname,
  };
  cookieSpecs.push(cookieSpec1);
  // const isWww = splits.slice(-3)[0] === "www";
  const cookieSpec2: CookieSpec = {
    name: "%",
    domain: tld,
  };
  cookieSpecs.push(cookieSpec2);
  const uniqBy1 = uniqBy(cookieSpecs, JSON.stringify);
  consola.success("cookieSpecsFromUrl", url, uniqBy1);
  return uniqBy1;
}
