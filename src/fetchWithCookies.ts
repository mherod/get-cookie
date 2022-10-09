// noinspection JSUnusedGlobalSymbols

import { fetch } from "cross-fetch";
import { merge } from "lodash";
// noinspection SpellCheckingInspection
import destr from "destr";
import FetchResponse from "./fetchResponse";
import { getGroupedRenderedCookies } from "./getGroupedRenderedCookies";

export async function fetchWithCookies(
  url: RequestInfo | URL,
  options: RequestInit | undefined = {}
): Promise<FetchResponse> {
  const defaultOptions: RequestInit = {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36"
    },
    redirect: "manual"
  };
  const url2: string = `${url}`;
  const url1: URL = new URL(url2);
  const domain = url1.hostname.replace(/^.*(\.\w+\.\w+)$/, (match, p1) => {
    return `%${p1}`;
  });
  const cookies: string[] = await getGroupedRenderedCookies({
    name: "%",
    domain: domain
  });
  const cookie = cookies.pop();
  const newOptions1: RequestInit = merge(defaultOptions, options, {
    headers: {
      Cookie: cookie
    }
  });
  try {
    const res = await fetch(url2, newOptions1);
    const newUrl = res.headers.get("location") as string;
    if (res.redirected || newUrl && newUrl !== url2) {
      return fetchWithCookies(newUrl, newOptions1);
    }
    const arrayBuffer1 = res.arrayBuffer();
    const arrayBuffer = async () => arrayBuffer1;
    const buffer = async () => arrayBuffer().then(Buffer.from);
    const text = async () => buffer().then((buffer) => buffer.toString("utf8"));
    const json = async () => text().then(destr);
    const formData = async () => text().then((text) => new URLSearchParams(text));
    const source2 = {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      arrayBuffer,
      buffer,
      text,
      json,
      formData
      //
    };
    return merge({}, res, source2);
  } catch (e) {
    throw e;
  }
}
