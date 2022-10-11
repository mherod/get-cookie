// noinspection JSUnusedGlobalSymbols

import { fetch as fetchImpl } from "cross-fetch";
import { merge } from "lodash";
// noinspection SpellCheckingInspection
import destr from "destr";
import CookieSpec from "./CookieSpec";
import { getGroupedRenderedCookies } from "./getGroupedRenderedCookies";
import { cookieJar } from "./MemoryCookieStore";

export async function fetchWithCookies(
  url: RequestInfo | URL,
  options: RequestInit | undefined = {},
  fetch: Function = fetchImpl
): Promise<Response> {
  const defaultOptions: RequestInit = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
    },
    redirect: "manual",
  };
  const url2: string = `${url}`;
  const url1: URL = new URL(url2);
  const domain = url1.hostname.replace(/^.*(\.\w+\.\w+)$/, (match, p1) => {
    return `%${p1}`;
  });
  const cookieSpec: CookieSpec = {
    name: "%",
    domain: domain,
  };
  const cookies: string[] = await getGroupedRenderedCookies(cookieSpec).catch(
    () => []
  );
  const cookie = cookies.pop();
  const newOptions1: RequestInit = merge(defaultOptions, options, {
    headers: {
      Cookie: cookie,
    },
  });
  try {
    const res: Response = await fetch(url2, newOptions1);
    const headers: [string, string][] = [];
    res.headers.forEach((value, key) => {
      headers.push([key, value]);
    });
    for (const [key, value] of headers) {
      if (key === "set-cookie") {
        await cookieJar.setCookie(value, url2);
        // const cookie = tough.parse(value);
        // if (cookie instanceof Cookie) {
        //   await memoryCookieStore.putCookie(cookie);
        // }
      }
    }

    const newUrl: string = res.headers.get("location") as string;
    if (res.redirected || (newUrl && newUrl !== url2)) {
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
