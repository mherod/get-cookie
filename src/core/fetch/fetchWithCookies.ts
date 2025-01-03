import { CookieSpec } from '../../types/CookieSpec'
import type FetchResponse from '../../types/FetchResponse'
import { getCookie } from '../cookies/getCookie'

/**
 * Builder class for creating fetch requests with cookies
 */
export class FetchWithCookiesBuilder {
  private url: URL | string
  private init?: RequestInit

  /**
   * Creates a new FetchWithCookiesBuilder instance
   * @param url - The URL to fetch
   * @param init - Optional request initialization options
   */
  public constructor(url: URL | string, init?: RequestInit) {
    this.url = url
    this.init = init
  }

  /**
   * Builds and executes the fetch request with cookies
   * @returns A promise that resolves to the fetch response
   */
  public build(): Promise<FetchResponse> {
    return fetchWithCookies(this.url, this.init)
  }
}

/**
 * Implementation of the FetchResponse interface
 */
export class FetchResponseImpl implements FetchResponse {
  private readonly response: Response

  /**
   * Creates a new FetchResponseImpl instance
   * @param response - The underlying Response object
   */
  public constructor(response: Response) {
    this.response = response
  }

  /**
   * Gets the HTTP status code of the response
   * @returns The status code
   */
  public get status(): number {
    return this.response.status
  }

  /**
   * Gets the HTTP status text of the response
   * @returns The status text
   */
  public get statusText(): string {
    return this.response.statusText
  }

  /**
   * Gets the response headers
   * @returns The headers object
   */
  public get headers(): Headers {
    return this.response.headers
  }

  /**
   * Gets the final URL of the response after any redirects
   * @returns The response URL
   */
  public get url(): string {
    return this.response.url
  }

  /**
   * Gets the response body as text
   * @returns A promise that resolves to the response text
   */
  public async text(): Promise<string> {
    return this.response.text()
  }

  /**
   * Gets the response body parsed as JSON
   * @returns A promise that resolves to the parsed JSON
   */
  public async json<T>(): Promise<T> {
    const text = await this.response.text()
    return JSON.parse(text) as T
  }

  /**
   * Gets the response body as URL-encoded form data
   * @returns A promise that resolves to URL search params
   */
  public async formData(): Promise<URLSearchParams> {
    const formData = await this.response.formData()
    const params = new URLSearchParams()
    formData.forEach((value, key) => {
      if (value instanceof File) {
        params.append(key, value.name)
      } else {
        params.append(key, String(value))
      }
    })
    return params
  }

  /**
   * Gets the response body as an ArrayBuffer
   * @returns A promise that resolves to the array buffer
   */
  public async arrayBuffer(): Promise<ArrayBuffer> {
    return this.response.arrayBuffer()
  }

  /**
   * Gets the response body as a Node.js Buffer
   * @returns A promise that resolves to the buffer
   */
  public async buffer(): Promise<Buffer> {
    const arrayBuffer = await this.response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}

/**
 * Fetches a URL with cookies from the browser
 * @param url - The URL to fetch
 * @param init - Optional request initialization options
 * @returns A promise that resolves to the fetch response
 */
export async function fetchWithCookies(url: URL | string, init?: RequestInit): Promise<FetchResponse> {
  const urlObj = new URL(url.toString())
  const cookieSpec: CookieSpec = { domain: urlObj.hostname, name: '*' }
  const cookies = await getCookie(cookieSpec)

  const headers = new Headers(init?.headers ?? {})
  const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader)
  }

  const response = await fetch(url, { ...init, headers })
  return new FetchResponseImpl(response)
}
