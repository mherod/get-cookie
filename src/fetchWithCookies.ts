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
  const url1 = new URL(`${url}`);
  const cookie: string[] = await getGroupedRenderedCookies({
    name: "%",
    domain: url1.hostname
  });
  merge(options, {
    credentials: "include",
    headers: {
      Cookie: cookie.pop()
    }
  });
  try {
    const res = await fetch(url, options);
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
