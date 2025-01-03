#!/usr/bin/env tsx

import { homedir } from "os";
import { join } from "path";

import { decodeBinaryCookies } from "../src/core/browsers/decodeBinaryCookies";
import type { BinaryCookieRow } from "../src/types/schemas";

// Cookie flag constants for human-readable output
const COOKIE_FLAGS = {
  SECURE: 0x1,
  HTTP_ONLY: 0x4,
  UNKNOWN1: 0x8,
  UNKNOWN2: 0x10,
} as const;

function getFlagDescriptions(flags: number | undefined): string[] {
  if (typeof flags !== "number") {
    return [];
  }

  const descriptions: string[] = [];
  if (flags & COOKIE_FLAGS.SECURE) {
    descriptions.push("Secure");
  }
  if (flags & COOKIE_FLAGS.HTTP_ONLY) {
    descriptions.push("HTTPOnly");
  }
  if (flags & COOKIE_FLAGS.UNKNOWN1) {
    descriptions.push("Unknown1");
  }
  if (flags & COOKIE_FLAGS.UNKNOWN2) {
    descriptions.push("Unknown2");
  }
  return descriptions;
}

function displayCookie(cookie: BinaryCookieRow, index: number): void {
  console.log(`\nCookie ${index + 1}:`);
  console.log("  Name:", cookie.name);
  console.log("  Value:", cookie.value);
  console.log("  Domain:", cookie.domain);
  console.log("  Path:", cookie.path);
  console.log("  Expiry:", new Date(cookie.expiry * 1000).toISOString());
  console.log("  Creation:", new Date(cookie.creation * 1000).toISOString());

  // Display version if present
  if (typeof cookie.version === "number") {
    console.log("  Version:", cookie.version);
  }

  // Display port if present
  if (typeof cookie.port === "number") {
    console.log("  Port:", cookie.port);
  }

  // Display comment if present
  if (typeof cookie.comment === "string" && cookie.comment.length > 0) {
    console.log("  Comment:", cookie.comment);
  }

  // Display commentURL if present
  if (typeof cookie.commentURL === "string" && cookie.commentURL.length > 0) {
    console.log("  Comment URL:", cookie.commentURL);
  }

  // Display flags in both hex and human-readable format
  if (typeof cookie.flags === "number") {
    const flagDescriptions = getFlagDescriptions(cookie.flags);
    console.log(
      "  Flags:",
      cookie.flags.toString(16).padStart(8, "0"),
      flagDescriptions.length > 0 ? `(${flagDescriptions.join(", ")})` : "",
    );
  }
}

function main(): void {
  const cookieDbPath = join(
    homedir(),
    "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
  );

  try {
    const cookies = decodeBinaryCookies(cookieDbPath);
    console.log(`Successfully decoded ${cookies.length} cookies\n`);

    // Display first 5 cookies as a sample
    console.log("Sample cookies (first 5):");
    cookies.slice(0, 5).forEach(displayCookie);
  } catch (error) {
    console.error("Error decoding cookies:", error);
  }
}

main();
