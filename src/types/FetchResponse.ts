// noinspection JSUnusedGlobalSymbols

/**
 * Interface representing an enhanced HTTP response with additional utility methods
 * Extends the standard Response interface with additional methods for data extraction
 */
export default interface FetchResponse {
  /** HTTP status code of the response */
  status: number;
  /** HTTP status text of the response */
  statusText: string;
  /** Response headers */
  headers: Headers;
  /** Final URL of the response after any redirects */
  url: string;
  /** Returns the response body as text */
  text: () => Promise<string>;
  /** Returns the response body parsed as JSON */
  json: () => Promise<unknown>;
  /** Returns the response body as URL-encoded form data */
  formData: () => Promise<URLSearchParams>;
  /** Returns the response body as an ArrayBuffer */
  arrayBuffer: () => Promise<ArrayBuffer>;
  /** Returns the response body as a Node.js Buffer */
  buffer: () => Promise<Buffer>;
}
