export default interface CookieSpec {
  domain: string;
  name: string;
}

export type MultiCookieSpec = CookieSpec | CookieSpec[];
