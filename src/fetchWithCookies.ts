// noinspection JSUnusedGlobalSymbols,ExceptionCaughtLocallyJS

import { fetch as fetchImpl } from "undici";
import { merge } from "lodash";
import { getMergedRenderedCookies } from "./getMergedRenderedCookies";
import { cookieSpecsFromUrl } from "./cookieSpecsFromUrl";
import CookieSpec from "./CookieSpec";
import { UserAgentBuilder } from "./UserAgentBuilder";
import { RequestInit, BodyInit as UndiciBodyInit } from "undici";

if (typeof fetchImpl !== "function") {
  throw new Error("fetch is not a function");
}

const userAgent: string = new UserAgentBuilder().build();

export type FetchRequestInit = {
  url: RequestInfo | URL | string;
  options?: RequestInit;
};

export type MergedRequestInit = Omit<RequestInit, 'body'> & {
  headers?: Record<string, string | readonly string[]>;
  body?: UndiciBodyInit;
};

export type ResponseType = Response & {
  buffer: () => Promise<Buffer>;
};

export type FetchFn = typeof fetchImpl | ((url: URL, options?: RequestInit) => Promise<ResponseType>);

/**
 * Class to handle fetch requests with cookies.
 */
class FetchWithCookies {
  private fetch: FetchFn;
  private userAgent: string;

  /**
   * Constructs a FetchWithCookies instance.
   * @param fetch - The fetch function to use.
   * @param userAgent - The User-Agent string to use.
   */
  constructor(fetch: FetchFn, userAgent: string) {
    if (typeof fetch !== "function") {
      throw new Error("fetch is not a function");
    }
    this.fetch = fetch;
    this.userAgent = userAgent;
  }

  /**
   * Gets the headers for a given URL.
   * @param url - The URL to get headers for.
   * @returns A promise that resolves to the headers.
   */
  private async getHeaders(url: URL): Promise<Record<string, string>> {
    const headers: Record<string, string> = { "User-Agent": this.userAgent };
    const cookieSpecs: CookieSpec[] = cookieSpecsFromUrl(url);
    const renderedCookie: string = await getMergedRenderedCookies(cookieSpecs).catch(() => "");

    if (renderedCookie) {
      headers["Cookie"] = renderedCookie;
    }

    return headers;
  }

  /**
   * Handles redirects for a given response.
   * @param res - The response to handle redirects for.
   * @param url - The original URL.
   * @param options - The request options.
   * @param originalRequest - The original request information.
   * @returns A promise that resolves to the final response.
   */
  private async handleRedirects(
    res: ResponseType,
    url: URL,
    options: RequestInit,
    originalRequest: FetchRequestInit,
  ): Promise<ResponseType> {
    const newUrl: string = res.headers.get("location") ?? res.url;

    if ([301, 302].includes(res.status) && newUrl && newUrl !== url.toString()) {
      return this.fetchWithCookies(newUrl, options, originalRequest);
    }

    if (res.status === 303 && newUrl && newUrl !== url.toString()) {
      const newOptions: RequestInit = {
        ...options,
        method: "GET",
        body: undefined,
      };
      return this.fetchWithCookies(newUrl, newOptions, originalRequest);
    }

    return res;
  }

  /**
   * Enhances the response with additional methods.
   * @param res - The response to enhance.
   * @returns A promise that resolves to the enhanced response.
   */
  private async enhanceResponse(res: Response): Promise<ResponseType> {
    // Clone response to allow multiple reads of the body
    const clonedResponse = res.clone();

    const buffer = async (): Promise<Buffer> => {
      const arrayBuffer = await clonedResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    };

    return merge(res, { buffer });
  }

  /**
   * Fetches a URL with cookies.
   * @param url - The URL to fetch.
   * @param options - The request options.
   * @param originalRequest - The original request information.
   * @returns A promise that resolves to the response.
   */
  public async fetchWithCookies(
    url: RequestInfo | URL | string,
    options: RequestInit | undefined = {},
    originalRequest?: FetchRequestInit,
  ): Promise<ResponseType> {
    const originalRequest1: FetchRequestInit = originalRequest || { url, options: options as RequestInit };
    const url1: URL = new URL(`${url}`);
    const headers = await this.getHeaders(url1);
    const defaultOptions: RequestInit = { headers, redirect: "manual" };
    const newOptions: RequestInit = merge(defaultOptions, { headers }, options);

    try {
      const res = await this.fetch(url1, newOptions);
      const redirectedRes = await this.handleRedirects(
        res as ResponseType,
        url1,
        newOptions,
        originalRequest1,
      );
      return this.enhanceResponse(redirectedRes);
    } catch (e) {
      throw e;
    }
  }
}

/**
 * Fetches a URL with cookies.
 * @param url - The URL to fetch.
 * @param options - The request options.
 * @param fetch - The fetch function to use.
 * @param originalRequest - The original request information.
 * @returns A promise that resolves to the response.
 */
export async function fetchWithCookies(
  url: RequestInfo | URL | string,
  options: RequestInit | undefined = {},
  fetch: FetchFn = fetchImpl as FetchFn,
  originalRequest?: FetchRequestInit,
): Promise<ResponseType> {
  const fetcher = new FetchWithCookies(fetch, userAgent);
  return fetcher.fetchWithCookies(url, options, originalRequest);
}
