// noinspection JSUnusedGlobalSymbols,ExceptionCaughtLocallyJS

import { fetch as fetchImpl } from "cross-fetch";
import { merge } from "lodash";
import destr from "destr";
import { getMergedRenderedCookies } from "./getMergedRenderedCookies";
import { cookieSpecsFromUrl } from "./cookieSpecsFromUrl";
import CookieSpec from "./CookieSpec";

if (typeof fetchImpl !== "function") {
  throw new Error("fetch is not a function");
}

/**
 * Class to build a User-Agent string.
 */
class UserAgentBuilder {
  private platform: string;
  private engine: string;
  private browser: string;
  private layout: string;

  /**
   * Constructs a UserAgentBuilder instance.
   * @param platform - The platform information.
   * @param engine - The engine information.
   * @param browser - The browser information.
   * @param layout - The layout information.
   */
  constructor(
    platform: string = "Macintosh; Intel Mac OS X 10_15_7",
    engine: string = "AppleWebKit/537.36 (KHTML, like Gecko)",
    browser: string = "Chrome/118.0.0.0",
    layout: string = "Safari/537.36",
  ) {
    this.platform = platform;
    this.engine = engine;
    this.browser = browser;
    this.layout = layout;
  }

  /**
   * Builds the User-Agent string.
   * @returns The User-Agent string.
   */
  build(): string {
    return `${this.platform} ${this.engine} ${this.browser} ${this.layout}`;
  }
}

const userAgent: string = new UserAgentBuilder().build();

interface FetchRequestInit {
  url: RequestInfo | URL | string;
  options?: RequestInit;
}

export type FetchFn =
  | typeof fetchImpl
  | ((url: URL, options?: RequestInit) => Promise<Response>);

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
  private async getHeaders(url: URL): Promise<HeadersInit> {
    const headers: HeadersInit = { "User-Agent": this.userAgent };
    const cookieSpecs: CookieSpec[] = cookieSpecsFromUrl(url);
    const renderedCookie: string = await getMergedRenderedCookies(
      cookieSpecs,
    ).catch(() => "");

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
    res: Response,
    url: URL,
    options: RequestInit,
    originalRequest: FetchRequestInit,
  ): Promise<Response> {
    const newUrl: string = res.headers.get("location") ?? res.url;

    if (
      [301, 302].includes(res.status) &&
      newUrl &&
      newUrl !== url.toString()
    ) {
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
  private async enhanceResponse(res: Response): Promise<Response> {
    const originalArrayBuffer: ArrayBuffer = await res.arrayBuffer();
    const originalBuffer: Buffer = Buffer.from(originalArrayBuffer);
    const originalText: string = originalBuffer.toString("utf8");

    const arrayBuffer = async (): Promise<ArrayBuffer> => originalArrayBuffer;
    const buffer = async (): Promise<Buffer> => originalBuffer;
    const text = async (): Promise<string> => originalText;
    const json = async (): Promise<any> => destr(originalText);
    const formData = async (): Promise<FormData> => {
      const urlSearchParams: URLSearchParams = new URLSearchParams(
        originalText,
      );
      const formData: FormData = new FormData();
      for (const [key, value] of urlSearchParams.entries()) {
        formData.append(key, value);
      }
      return formData;
    };

    return merge(res, { arrayBuffer, text, json, buffer, formData });
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
  ): Promise<Response> {
    const originalRequest1: FetchRequestInit = originalRequest || {
      url,
      options,
    };
    const url1: URL = new URL(`${url}`);
    const headers: HeadersInit = await this.getHeaders(url1);
    const defaultOptions: RequestInit = { headers, redirect: "manual" };
    const newOptions: RequestInit = merge(defaultOptions, { headers }, options);

    try {
      const res: Response = await this.fetch(url1, newOptions);
      const redirectedRes: Response = await this.handleRedirects(
        res,
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
): Promise<Response> {
  const fetcher = new FetchWithCookies(fetch, userAgent);
  return fetcher.fetchWithCookies(url, options, originalRequest);
}
