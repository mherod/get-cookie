#!/usr/bin/env tsx

import { getCookie, type ExportedCookie } from "../src/index";

interface CookieReadiness {
  matchingCookies: number;
}

function summarizeReadiness(cookies: ExportedCookie[]): CookieReadiness {
  return {
    matchingCookies: cookies.length,
  };
}

async function main(): Promise<void> {
  const cookies = await getCookie({
    name: "session_token",
    domain: "app.example.com",
  });

  if (cookies.length === 0) {
    console.log("No readable authentication cookie was found.");
    return;
  }

  // Keep this status-only. A domain query does not prove that a cookie is
  // applicable to one exact outgoing URL.
  const readiness = summarizeReadiness(cookies);

  console.log(
    `Found ${readiness.matchingCookies} matching authentication cookie(s).`,
  );
  console.log("Cookie values were not printed or forwarded.");
}

void main().catch(() => {
  console.error("Authentication cookie lookup failed.");
  process.exitCode = 1;
});
