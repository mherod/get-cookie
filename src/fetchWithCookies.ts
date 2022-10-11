// noinspection JSUnusedGlobalSymbols

import { fetch as fetchImpl } from "cross-fetch";
import { merge } from "lodash";
// noinspection SpellCheckingInspection
import destr from "destr";
import { cookieJar } from "./CookieStore";
import UserAgent from "user-agents";
import { parsedArgs } from "./argv";
import { blue, yellow } from "colorette";
import { getMergedRenderedCookies } from "./getMergedRenderedCookies";
import { cookieSpecsFromUrl } from "./cookieSpecsFromUrl";
import CookieSpec from "./CookieSpec";

export async function fetchWithCookies(
  url: RequestInfo | URL,
  options: RequestInit | undefined = {},
  fetch: Function = fetchImpl
): Promise<Response> {
  const headers = {
    "User-Agent": new UserAgent().toString(),
  };
  const defaultOptions: RequestInit = {
    headers,
    redirect: "manual",
  };
  const url2: string = `${url}`;
  const url1: URL = new URL(url2);
  const cookieSpecs: CookieSpec[] = cookieSpecsFromUrl(url1);
  const cookie = await getMergedRenderedCookies(cookieSpecs).catch(() => "");
  if (cookie.length > 0) {
    merge(headers, {
      Cookie: cookie,
    });
  }
  if (parsedArgs["dump-request-headers"]) {
    console.log(blue("Request headers:"), headers);
  }
  const newOptions1: RequestInit = merge(defaultOptions, options, { headers });
  try {
    const res: Response = await fetch(url2, newOptions1);
    const headers: [string, string][] = [];
    res.headers.forEach((value, key) => {
      headers.push([key, value]);
    });
    for (const [key, value] of headers) {
      if (key === "set-cookie") {
        await cookieJar.setCookie(value, url2);
        if (parsedArgs.verbose) {
          console.log(blue(`Set-Cookie: ${yellow(value)} ${yellow(url2)}`));
        }
        // const cookie = tough.parse(value);
        // if (cookie instanceof Cookie) {
        //   await memoryCookieStore.putCookie(cookie);
        // }
      }
    }

    const newUrl: string = res.headers.get("location") as string;
    if (res.redirected || (newUrl && newUrl !== url2)) {
      if (parsedArgs.verbose) {
        console.log(blue(`Redirected to `), yellow(newUrl));
      }
      return fetchWithCookies(newUrl, newOptions1);
    }

    const arrayBuffer1: Promise<ArrayBuffer> = res.arrayBuffer();

    async function arrayBuffer(): Promise<ArrayBuffer> {
      return arrayBuffer1;
    }

    async function buffer(): Promise<Buffer> {
      return arrayBuffer().then(Buffer.from);
    }

    async function text(): Promise<string> {
      return buffer().then((buffer) => buffer.toString("utf8"));
    }

    async function json(): Promise<any> {
      return text().then((text) => destr(text));
    }

    async function formData(): Promise<FormData> {
      const urlSearchParams: URLSearchParams = await text().then(
        (text) => new URLSearchParams(text)
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
