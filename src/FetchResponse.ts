// noinspection JSUnusedGlobalSymbols
import type { Response } from "cross-fetch";

export default interface FetchResponse extends Response {
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  text: () => Promise<string>;
  json: () => Promise<any>;
  formData: () => Promise<URLSearchParams>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  buffer: () => Promise<Buffer>;
}
