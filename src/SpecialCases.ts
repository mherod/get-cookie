import { CookieSpec } from "./CookieSpec";

export function specialCases({ name, domain }: CookieSpec): {
  specifiedName: boolean;
  specifiedDomain: boolean;
  //
} {
  const wildcardRegexp = /^([*%])$/i;
  return {
    specifiedName: name.match(wildcardRegexp) == null,
    specifiedDomain: domain.match(wildcardRegexp) == null,
    //
  };
}
