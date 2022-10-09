#!/usr/bin/env node
// noinspection JSUnusedGlobalSymbols

import { queryCookies } from "./queryCookies";
import FirefoxCookieQueryStrategy from "./browsers/FirefoxCookieQueryStrategy";
import ChromeCookieQueryStrategy from "./browsers/ChromeCookieQueryStrategy";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import { CookieRequest } from "./CookieRequest";
import { ExportedCookie } from "./ExportedCookie";
import { getGroupedRenderedCookies } from "./getGroupedRenderedCookies";
import { fetchWithCookies } from "./fetchWithCookies";

export async function getCookie(params: CookieRequest): Promise<ExportedCookie | undefined> {
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

export async function getFirefoxCookie(params: CookieRequest): Promise<ExportedCookie | undefined> {
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

export async function getChromeCookie(params: CookieRequest): Promise<ExportedCookie | undefined> {
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

export {
  getGroupedRenderedCookies,
  fetchWithCookies,
};

export * from "./CookieRequest";
export * from "./CookieRow";
export * from "./ExportedCookie";
