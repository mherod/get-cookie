#!/usr/bin/env tsx

import { readFileSync } from "fs";
import { join } from "path";

import { decodeBinaryCookies } from "../src/core/browsers/decodeBinaryCookies";
import type { BinaryCookieRow } from "../src/types/schemas";

function formatCookieValue(value: unknown): string {
  const stringValue = Buffer.isBuffer(value)
    ? value.toString('utf8')
    : String(value);
  return stringValue.length > 50
    ? `${stringValue.substring(0, 50)}...`
    : stringValue;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function getCookieFilePath(): string {
  const homeDir = process.env.HOME;
  if (typeof homeDir !== "string" || homeDir.trim().length === 0) {
    console.error("HOME environment variable not set or empty");
    process.exit(1);
  }

  return join(
    homeDir,
    "Library",
    "Containers",
    "com.apple.Safari",
    "Data",
    "Library",
    "Cookies",
    "Cookies.binarycookies",
  );
}

function printCookie(cookie: BinaryCookieRow, index: number, total: number): void {
  console.log(`\nCookie ${index + 1} of ${total}:`);
  console.log(`  Name: ${cookie.name}`);
  console.log(`  Domain: ${cookie.domain}`);
  console.log(`  Path: ${cookie.path}`);
  console.log(`  Flags: ${cookie.flags ?? 'none'}`);
  console.log(`  Version: ${cookie.version ?? 'none'}`);

  if (typeof cookie.port === 'number') {
    console.log(`  Port: ${cookie.port}`);
  }

  console.log(`  Value: ${formatCookieValue(cookie.value)}`);
  console.log(`  Creation: ${formatDate(cookie.creation)}`);
  console.log(`  Expiry: ${formatDate(cookie.expiry)}`);

  if (typeof cookie.comment === 'string' && cookie.comment.length > 0) {
    console.log(`  Comment: ${cookie.comment}`);
  }

  if (typeof cookie.commentURL === 'string' && cookie.commentURL.length > 0) {
    console.log(`  Comment URL: ${cookie.commentURL}`);
  }
}

function processCookies(cookies: BinaryCookieRow[]): void {
  if (cookies.length === 0) {
    console.warn("No cookies found in the cookie file");
    return;
  }

  console.log(`Found ${cookies.length} cookies`);
  cookies.forEach((cookie, index) => printCookie(cookie, index, cookies.length));
}

function main(): void {
  console.log("Starting script...");
  const cookieDbPath = getCookieFilePath();

  try {
    console.log("Reading Safari cookies from:", cookieDbPath);
    const fileStats = readFileSync(cookieDbPath);
    console.log(`Cookie file size: ${fileStats.length} bytes`);

    const cookies = decodeBinaryCookies(cookieDbPath);
    console.log("Successfully decoded cookies");
    processCookies(cookies);
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

main();

