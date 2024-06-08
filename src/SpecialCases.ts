import CookieSpec from "./CookieSpec";

export function specialCases({ name, domain }: CookieSpec): {
  specifiedName: boolean;
  specifiedDomain: boolean;
} {
  const wildcardRegexp: RegExp = /^([*%])$/i;
  const specifiedName: boolean = name.match(wildcardRegexp) == null;
  const specifiedDomain: boolean = domain.match(wildcardRegexp) == null;

  return {
    specifiedName,
    specifiedDomain,
  };
}
