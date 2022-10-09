#!/usr/bin/env node
// noinspection JSUnusedGlobalSymbols

import { queryCookies } from "./queryCookies";
import FirefoxCookieQueryStrategy from "./browsers/FirefoxCookieQueryStrategy";
import ChromeCookieQueryStrategy from "./browsers/ChromeCookieQueryStrategy";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import ExportedCookie from "./ExportedCookie";
import { groupBy } from "lodash";
import { resultsRendered } from "./resultsRendered";

export async function getCookie(params: { name: string; domain: string; }) {
  const cookies = await queryCookies(
    params,
    new CompositeCookieQueryStrategy()
    //
  );
  if (Array.isArray(cookies) && cookies.length > 0) {
    return cookies.find((cookie) => cookie != null);
  } else {
    throw new Error("Cookie not found");
  }
}

/**
 *
 * @param params
 * @returns {Promise<*>}
 */
export async function getFirefoxCookie(params: { name: string; domain: string; }) {
  const cookies = await queryCookies(
    params,
    new FirefoxCookieQueryStrategy()
    //
  );
  if (Array.isArray(cookies) && cookies.length > 0) {
    return cookies.find((cookie) => cookie != null);
  } else {
    throw new Error("Cookie not found");
  }
}

/**
 *
 * @param params
 * @returns {Promise<*>}
 */
export async function getChromeCookie(params: { name: string; domain: string; }) {
  const cookies = await queryCookies(
    params,
    new ChromeCookieQueryStrategy()
    //
  );
  if (Array.isArray(cookies) && cookies.length > 0) {
    return cookies.find((cookie) => cookie != null);
  } else {
    throw new Error("Cookie not found");
  }
}

export async function getGroupedRenderedCookies({ name, domain }: { name: string; domain: string; }): Promise<string[]> {
  const cookies: ExportedCookie[] = await queryCookies(
    { name, domain },
    new CompositeCookieQueryStrategy()
    //
  );
  if (Array.isArray(cookies) && cookies.length > 0) {
    const results = await queryCookies({ name, domain });
    const groupedByFile = groupBy(results, (r) => r.meta?.file);
    return Object.keys(groupedByFile).map((file) => {
      const results = groupedByFile[file];
      return resultsRendered(results);
    });
  } else {
    throw new Error("Cookie not found");
  }
}

export async function getRenderedCookie(params: { name: string; domain: string; }) {
  const cookies = await queryCookies(
    params,
    new CompositeCookieQueryStrategy()
    //
  );
  if (Array.isArray(cookies) && cookies.length > 0) {
    return cookies.find((cookie) => cookie != null);
  } else {
    throw new Error("Cookie not found");
  }
}
