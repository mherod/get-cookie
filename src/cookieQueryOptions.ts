import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import { merge } from "lodash";

export type CookieQueryOptions<T extends CookieQueryStrategy> = {
  strategy?: T;
  limit?: number;
  removeExpired?: boolean;
};

export const defaultCookieQueryOptions: CookieQueryOptions<CookieQueryStrategy> =
  {
    strategy: new CompositeCookieQueryStrategy(),
    limit: undefined,
    removeExpired: undefined,
  };

export function mergedWithDefaults<T extends CookieQueryStrategy>(
  options?: CookieQueryOptions<T>,
): CookieQueryOptions<T> {
  const mergedOptions: CookieQueryOptions<T> = merge(
    {},
    defaultCookieQueryOptions,
    options,
  );
  return mergedOptions;
}
