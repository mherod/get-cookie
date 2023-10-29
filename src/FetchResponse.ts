// noinspection JSUnusedGlobalSymbols

export default interface FetchResponse {
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
