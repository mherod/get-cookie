#!/usr/bin/env node
// noinspection JSUnusedGlobalSymbols

import { queryCookies } from "./queryCookies";
import FirefoxCookieQueryStrategy from "./browsers/FirefoxCookieQueryStrategy";
import ChromeCookieQueryStrategy from "./browsers/ChromeCookieQueryStrategy";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import { getGroupedRenderedCookies } from "./getGroupedRenderedCookies";
import { fetchWithCookies } from "./fetchWithCookies";

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

export default {
  getCookie,
  getFirefoxCookie,
  getChromeCookie,
  getGroupedRenderedCookies,
  fetchWithCookies
}
