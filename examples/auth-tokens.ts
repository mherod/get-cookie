#!/usr/bin/env tsx
/**
 * Example: Extracting authentication tokens from browser cookies
 * This demonstrates how to use get-cookie for extracting auth tokens
 * for API automation or testing purposes
 */

import { getCookie } from "../src";

interface AuthToken {
  site: string;
  tokenName: string;
  value: string;
  browser: string;
  expiry: Date | string | number | null;
}

async function extractAuthTokens() {
  console.log("🔐 Authentication Token Extraction Example\n");
  console.log("=".repeat(50));

  // Common authentication cookie patterns
  const authPatterns = [
    {
      site: "github.com",
      cookies: ["user_session", "_gh_sess", "dotcom_user"],
    },
    {
      site: "google.com",
      cookies: ["OSID", "SID", "HSID", "SSID", "APISID", "SAPISID"],
    },
    { site: "twitter.com", cookies: ["auth_token", "ct0", "kdt"] },
    { site: "linkedin.com", cookies: ["li_at", "JSESSIONID"] },
    { site: "stackoverflow.com", cookies: ["acct", "prov"] },
  ];

  const foundTokens: AuthToken[] = [];

  for (const pattern of authPatterns) {
    console.log(`\n🔍 Checking ${pattern.site}...`);

    for (const cookieName of pattern.cookies) {
      try {
        const cookies = await getCookie({
          name: cookieName,
          domain: pattern.site,
        });

        if (cookies.length > 0) {
          cookies.forEach((cookie) => {
            foundTokens.push({
              site: pattern.site,
              tokenName: cookieName,
              value: `${cookie.value.substring(0, 20)}...`, // Truncate for security
              browser: cookie.meta?.browser || "Unknown",
              expiry: cookie.expiry || null,
            });

            console.log(
              `  ✓ Found ${cookieName} in ${cookie.meta?.browser || "Unknown"}`,
            );
          });
        }
      } catch (_error) {
        // Cookie not found or error accessing
      }
    }
  }

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 Summary of Found Authentication Tokens\n");

  if (foundTokens.length === 0) {
    console.log(
      "No authentication tokens found. Make sure you're logged into these sites.",
    );
  } else {
    // Group by site
    const bySite = foundTokens.reduce(
      (acc, token) => {
        if (!acc[token.site]) {
          acc[token.site] = [];
        }
        acc[token.site]?.push(token);
        return acc;
      },
      {} as Record<string, AuthToken[]>,
    );

    Object.entries(bySite).forEach(([site, tokens]) => {
      console.log(`\n${site}:`);
      tokens.forEach((token) => {
        const expiryInfo =
          token.expiry instanceof Date
            ? `expires ${new Date(token.expiry).toLocaleDateString()}`
            : token.expiry === "Infinity"
              ? "session cookie"
              : "unknown expiry";

        console.log(`  • ${token.tokenName} (${token.browser}, ${expiryInfo})`);
        console.log(`    Value: ${token.value}`);
      });
    });

    // Security reminder
    console.log("\n⚠️  Security Reminder:");
    console.log("These are sensitive authentication tokens. Never:");
    console.log("  - Share them publicly");
    console.log("  - Commit them to version control");
    console.log("  - Use them outside of their intended purpose");
  }

  // Example: Using tokens for API requests
  console.log(`\n${"=".repeat(50)}`);
  console.log("💡 Example: Using GitHub token for API request\n");

  const githubSession = foundTokens.find(
    (t) => t.site === "github.com" && t.tokenName === "user_session",
  );

  if (githubSession) {
    console.log("To use this token with GitHub API:");
    console.log("```javascript");
    console.log(
      "const response = await fetch('https://api.github.com/user', {",
    );
    console.log("  headers: {");
    console.log("    'Cookie': `user_session=\\$\\{token\\}`,");
    console.log("    'User-Agent': 'Your-App-Name'");
    console.log("  }");
    console.log("});");
    console.log("```");
    console.log("\nNote: Most modern APIs prefer OAuth tokens over cookies.");
  } else {
    console.log(
      "No GitHub session found. Log into GitHub in your browser first.",
    );
  }
}

// Run the example
extractAuthTokens().catch(console.error);
