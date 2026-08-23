#!/usr/bin/env tsx

import { getCookie, type ExportedCookie } from "../src/index";

interface PreparedRequest {
  headers: {
    Cookie: string;
  };
}

function prepareAuthorizedRequest(cookie: ExportedCookie): PreparedRequest {
  return {
    headers: {
      Cookie: `${cookie.name}=${String(cookie.value)}`,
    },
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

  const cookie = cookies[0];
  if (!cookie) {
    return;
  }

  // Pass this object directly to an authorized local request. Do not log,
  // persist, or share it: the Cookie header contains a live credential.
  const request = prepareAuthorizedRequest(cookie);
  void request;

  console.log(
    `Prepared an in-memory request from ${cookies.length} matching cookie(s).`,
  );
  console.log("Cookie values were not printed.");
}

void main().catch(() => {
  console.error("Authentication cookie lookup failed.");
  process.exitCode = 1;
});
