#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { decodeBinaryCookies } from "../src/core/browsers/safari/decodeBinaryCookies";
import type { BinaryCookieRow } from "../src/types/schemas";
import { createTaggedLogger } from "../src/utils/logHelpers";

const logger = createTaggedLogger("test-safari-cookies");

function formatCookieValue(value: unknown): string {
  const stringValue = Buffer.isBuffer(value)
    ? value.toString("utf8")
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
    logger.error("HOME environment variable not set or empty");
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

function printCookie(
  cookie: BinaryCookieRow,
  index: number,
  total: number,
): void {
  logger.info(`\nCookie ${index + 1} of ${total}:`);
  logger.info(`  Name: ${cookie.name}`);
  logger.info(`  Domain: ${cookie.domain}`);
  logger.info(`  Path: ${cookie.path}`);
  logger.info(`  Flags: ${cookie.flags ?? "none"}`);
  logger.info(`  Version: ${cookie.version ?? "none"}`);

  if (typeof cookie.port === "number") {
    logger.info(`  Port: ${cookie.port}`);
  }

  logger.info(`  Value: ${formatCookieValue(cookie.value)}`);
  logger.info(`  Creation: ${formatDate(cookie.creation)}`);
  logger.info(`  Expiry: ${formatDate(cookie.expiry)}`);

  if (typeof cookie.comment === "string" && cookie.comment.length > 0) {
    logger.info(`  Comment: ${cookie.comment}`);
  }

  if (typeof cookie.commentURL === "string" && cookie.commentURL.length > 0) {
    logger.info(`  Comment URL: ${cookie.commentURL}`);
  }
}

function processCookies(cookies: BinaryCookieRow[]): void {
  if (cookies.length === 0) {
    logger.warn("No cookies found in the cookie file");
    return;
  }

  logger.info(`Found ${cookies.length} cookies`);
  cookies.forEach((cookie, index) => {
    printCookie(cookie, index, cookies.length);
  });
}

function main(): void {
  logger.info("Starting script...");
  const cookieDbPath = getCookieFilePath();

  try {
    logger.info("Reading Safari cookies from:", cookieDbPath);
    const fileStats = readFileSync(cookieDbPath);
    logger.info(`Cookie file size: ${fileStats.length} bytes`);

    const cookies = decodeBinaryCookies(cookieDbPath);
    logger.success("Successfully decoded cookies");
    processCookies(cookies);
  } catch (error) {
    logger.error("Error processing cookies", { error });
    process.exit(1);
  }
}

main();
