// noinspection JSUnusedGlobalSymbols,ExceptionCaughtLocallyJS

import { fetch as fetchImpl } from "cross-fetch";
import { merge } from "lodash";
// noinspection SpellCheckingInspection
import destr from "destr";
import { parsedArgs } from "./argv";
import { getMergedRenderedCookies } from "./getMergedRenderedCookies";
import { cookieSpecsFromUrl } from "./cookieSpecsFromUrl";
import CookieSpec from "./CookieSpec";
import consola from "consola";

if (typeof fetchImpl !== "function") {
  throw new Error("fetch is not a function");
}

function constructUserAgent(
  platform = "Macintosh; Intel Mac OS X 10_15_7",
  engine = "AppleWebKit/537.36 (KHTML, like Gecko)",
  browser = "Chrome/118.0.0.0",
  layout = "Safari/537.36",
): string {
  return [platform, engine, browser, layout].join(" ");
}

const userAgent = constructUserAgent();

interface FetchRequestInit {
  url: RequestInfo | URL | string;
  options?: RequestInit;
}

export type FetchFn =
  | typeof fetchImpl
  | ((url: URL, options?: RequestInit) => Promise<Response>);

export async function fetchWithCookies(
  url: RequestInfo | URL | string,
  options: RequestInit | undefined = {},
  fetch: FetchFn = fetchImpl as FetchFn,
  originalRequest?: FetchRequestInit,
): Promise<Response> {
  if (typeof fetch !== "function") {
    const message = "fetch is not a function";
    consola.error(message);
    throw new Error(message);
  }
  const originalRequest1 = originalRequest || { url, options };
  const headers: HeadersInit = {
    "User-Agent": userAgent,
  };
  const defaultOptions: RequestInit = {
    headers,
    redirect: "manual",
  };
  const url2: string = `${url}`;
  const url1: URL = new URL(url2);
  consola.start("fetchWithCookies", url2);
  const cookieSpecs: CookieSpec[] = cookieSpecsFromUrl(url1);
  const renderedCookie = await getMergedRenderedCookies(cookieSpecs).catch(
    (err) => {
      consola.error(err);
      return "";
    },
  );
  if (renderedCookie) {
    headers["Cookie"] = renderedCookie;
  } else {
    consola.info("No cookies found for this request");
  }
  if (parsedArgs["dump-request-headers"]) {
    consola.info("Request URL:", url1.href);
    consola.info("Request headers:", headers);
  }
  const newOptions1: RequestInit = merge(defaultOptions, { headers }, options);
  try {
    const res: Response = await fetch(url1, newOptions1);
    // noinspection JSMismatchedCollectionQueryUpdate
    const headers: [string, string][] = [];
    res.headers.forEach((value, key) => {
      headers.push([key, value]);
    });
    // for (const [key, value] of headers) {
    //   if (key === "set-cookie") {
    //     const cookieJar1 = await cookieJarPromise;
    //     await cookieJar1.setCookie(value, url2);
    //     if (parsedArgs.verbose) {
    //       console.log(blue(`Set-Cookie:`), yellow(value), yellow(url2));
    //     }
    //   }
    // }

    const newUrl: string = res.headers.get("location") ?? res.url;
    // const sameHost = new URL(newUrl).host === url1.host;
    if (res.status == 301 || res.status == 302) {
      // follow the redirect
      if (newUrl && newUrl !== url2) {
        if (parsedArgs.verbose || parsedArgs["dump-response-headers"]) {
          consola.info(`Redirected to `, newUrl);
        }
        return fetchWithCookies(
          //
          newUrl,
          newOptions1,
          fetch,
          originalRequest1,
          //
        );
      }
    }
    if (res.status == 303 && newUrl && newUrl !== url2) {
      // follow the redirect with GET
      let newOptions2: RequestInit = {};
      switch (newOptions1.method) {
        case "POST":
        case "PUT":
        case "DELETE":
          merge(newOptions2, newOptions1, { method: "GET" });
          newOptions2.body = undefined; // TODO: is this needed?
          break;
        case "HEAD":
        case "GET":
          merge(newOptions2, newOptions1);
          newOptions2.body = undefined; // TODO: is this needed?
          break;
        default:
          merge(newOptions2, newOptions1);
          break;
      }
      if (parsedArgs.verbose) {
        console.log(`Redirected to `, newUrl);
      }
      return fetchWithCookies(
        //
        newUrl,
        newOptions2,
        fetch,
        originalRequest1,
        //
      );
    }

    // all deserialize functions will use the arraybuffer
    const arrayBufferPromise: Promise<ArrayBuffer> = res.arrayBuffer();
    const bufferPromise = arrayBufferPromise.then(Buffer.from);

    async function arrayBuffer(): Promise<ArrayBuffer> {
      return arrayBufferPromise;
    }

    async function buffer(): Promise<Buffer> {
      return bufferPromise;
    }

    async function text(): Promise<string> {
      const buffer1 = await bufferPromise;
      return buffer1.toString("utf8");
    }

    async function json(): Promise<any> {
      const text1 = await text();
      return destr(text1);
    }

    async function formData(): Promise<FormData> {
      const urlSearchParams: URLSearchParams = await text().then(
        (text) => new URLSearchParams(text),
      );
      const formData = new FormData();
      for (const [key, value] of urlSearchParams.entries()) {
        formData.append(key, value);
      }
      return formData;
    }

    const res1: Response = res;
    const source2 = {
      arrayBuffer,
      text,
      json,
      buffer,
      formData,
      //
    };
    return merge(res1, source2);
  } catch (e) {
    throw e;
  }
}
