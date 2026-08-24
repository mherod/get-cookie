#!/usr/bin/env tsx

import {
  ChromiumCookieQueryStrategy,
  CompositeCookieQueryStrategy,
  FirefoxCookieQueryStrategy,
  SafariCookieQueryStrategy,
  type ExportedCookie,
} from "../src/index";

const name = "session_token";
const domain = "app.example.com";

function summarize(label: string, cookies: ExportedCookie[]): void {
  if (cookies.length === 0) {
    console.log(`${label}: no readable matches`);
    return;
  }

  const byBrowser = new Map<string, number>();
  for (const cookie of cookies) {
    const browser = cookie.meta?.browser ?? "unknown";
    byBrowser.set(browser, (byBrowser.get(browser) ?? 0) + 1);
  }

  const sources = [...byBrowser.entries()]
    .map(([browser, count]) => `${browser}=${count}`)
    .join(", ");
  console.log(`${label}: ${cookies.length} match(es) (${sources})`);
}

async function main(): Promise<void> {
  // Browser-specific strategies are part of the public API.
  const edge = new ChromiumCookieQueryStrategy("edge");
  const firefox = new FirefoxCookieQueryStrategy();
  const safari = new SafariCookieQueryStrategy();

  summarize("Edge", await edge.queryCookies(name, domain));

  // Compose only the strategies your application intends to inspect.
  const selectedBrowsers = new CompositeCookieQueryStrategy([
    edge,
    firefox,
    safari,
  ]);
  summarize(
    "Selected browsers",
    await selectedBrowsers.queryCookies(name, domain),
  );
}

void main().catch(() => {
  console.error("Cookie demonstration failed.");
  process.exitCode = 1;
});
