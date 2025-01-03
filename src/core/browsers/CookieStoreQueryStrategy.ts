import { Cookie, CookieJar, Store } from "tough-cookie";
import { z } from "zod";

import {
  BrowserName,
  CookieQueryStrategy,
  CookieSpec,
  CookieSpecSchema,
  ExportedCookie,
  ExportedCookieSchema,
} from "@/types/schemas";
import { SafeParseResult, isParseSuccess } from "@/types/ZodUtils";
import { cookieJarPromise } from "@core/cookies/CookieStore";
import logger from "@utils/logger";
import { stringToRegex } from "@utils/stringToRegex";

const consola = logger.withTag("CookieStoreQueryStrategy");

interface ParsedCookie {
  domain: string | null;
  key: string | null;
  value: string;
  expires?: Date;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
}

const ToughCookieSchema = z
  .object({
    domain: z.string().nullable(),
    key: z.string().nullable(),
    value: z.string(),
    expires: z.date().optional(),
    path: z.string().optional(),
    secure: z.boolean().optional(),
    httpOnly: z.boolean().optional(),
  })
  .transform((data): ParsedCookie => data);

/**
 * A strategy for querying cookies from an internal cookie store
 * This class implements the CookieQueryStrategy interface and provides access to cookies stored internally
 * @example
 */
export default class CookieStoreQueryStrategy implements CookieQueryStrategy {
  /**
   *
   */
  public readonly browserName: BrowserName = "internal";

  /**
   * Queries cookies from the internal cookie store
   * @param name - The name of the cookie to query
   * @param domain - The domain to query cookies from
   * @returns A promise that resolves to an array of exported cookies from the internal store
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    const cookieSpec = { name, domain } as const;
    const result = CookieSpecSchema.safeParse(
      cookieSpec,
    ) as SafeParseResult<CookieSpec>;

    if (!isParseSuccess(result)) {
      consola.warn("Invalid cookie spec:", result.error.format());
      return [];
    }

    const validatedSpec = result.data;
    const exportedCookies = await this.getAllExportedCookies(validatedSpec);
    const isWildcard =
      /^([*%])$/i.test(validatedSpec.name) &&
      /^([*%])$/i.test(validatedSpec.domain);

    if (isWildcard) {
      return exportedCookies;
    }

    if (validatedSpec.domain !== "%") {
      const domainCookies = await this.getDomainCookies(validatedSpec);
      exportedCookies.push(...domainCookies);
    }

    return this.filterCookies(exportedCookies, validatedSpec);
  }

  private async getAllExportedCookies(
    cookieSpec: CookieSpec,
  ): Promise<ExportedCookie[]> {
    const cookies = await this.getAllCookies();
    return cookies
      .map((cookie) => this.extractCookie(cookie, cookieSpec))
      .filter((cookie): cookie is ExportedCookie => cookie !== null);
  }

  private async getDomainCookies(
    cookieSpec: CookieSpec,
  ): Promise<ExportedCookie[]> {
    const domainMatch = cookieSpec.domain.match(/(\w+.+\w+)/gi);
    const cleanDomain =
      domainMatch?.[domainMatch.length - 1] ?? cookieSpec.domain;
    const url = new URL(`https://${cleanDomain}`);

    const cookies = await this.getCookies(url.href);
    return cookies
      .map((cookie) => this.extractCookie(cookie, cookieSpec))
      .filter((cookie): cookie is ExportedCookie => cookie !== null);
  }

  private filterCookies(
    exportedCookies: ExportedCookie[],
    cookieSpec: CookieSpec,
  ): ExportedCookie[] {
    const domainRegex = stringToRegex(cookieSpec.domain);

    if (cookieSpec.name === "%") {
      return exportedCookies.filter((cookie) =>
        domainRegex.test(cookie.domain),
      );
    }

    const nameRegex = stringToRegex(cookieSpec.name);
    return exportedCookies.filter(
      (cookie) =>
        nameRegex.test(cookie.name) && domainRegex.test(cookie.domain),
    );
  }

  private extractCookie(
    cookie: Cookie,
    cookieSpec: CookieSpec,
  ): ExportedCookie | null {
    const parsedResult = ToughCookieSchema.safeParse(
      cookie,
    ) as SafeParseResult<ParsedCookie>;

    if (!isParseSuccess(parsedResult)) {
      consola.warn("Invalid cookie format:", parsedResult.error.format());
      return null;
    }

    const validatedCookie = parsedResult.data;
    const exportedCookieData = {
      domain: validatedCookie.domain ?? cookieSpec.domain,
      name: validatedCookie.key ?? cookieSpec.name,
      value: validatedCookie.value,
      expiry: validatedCookie.expires ?? "Infinity",
      meta: {
        file: "tough-cookie",
      },
    } as const;

    const exportedResult = ExportedCookieSchema.safeParse(
      exportedCookieData,
    ) as SafeParseResult<ExportedCookie>;

    if (!isParseSuccess(exportedResult)) {
      consola.warn(
        "Failed to create exported cookie:",
        exportedResult.error.format(),
      );
      return null;
    }

    return exportedResult.data;
  }

  private async getCookies(url: string): Promise<Cookie[]> {
    const cookieJar = await cookieJarPromise;
    return new Promise<Cookie[]>((resolve, reject) => {
      cookieJar.getCookies(url, (err, cookies) => {
        if (err) {
          reject(err);
        } else {
          resolve(cookies ?? []);
        }
      });
    });
  }

  private async getAllCookies(): Promise<Cookie[]> {
    const cookieJar = await cookieJarPromise;
    const store = (cookieJar as CookieJar & { store: Store }).store;

    return new Promise<Cookie[]>((resolve, reject) => {
      store.getAllCookies((err, cookies) => {
        if (err) {
          reject(err);
        } else {
          resolve(cookies ?? []);
        }
      });
    });
  }
}
