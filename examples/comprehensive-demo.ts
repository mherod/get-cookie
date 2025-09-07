#!/usr/bin/env tsx
/**
 * Comprehensive demonstration of get-cookie library features
 * This example shows various ways to query and work with browser cookies
 */

import { getCookie } from "../src";
import { CookieStrategyFactory } from "../src/cli/services/CookieStrategyFactory";

async function demonstrateFeatures() {
  console.log("🍪 Get-Cookie Library Demonstration\n");
  console.log("=".repeat(50));

  // 1. Basic cookie retrieval
  console.log("\n📌 Example 1: Get specific cookies by name");
  console.log("-".repeat(40));
  try {
    const githubSession = await getCookie({
      name: "user_session",
      domain: "github.com",
    });

    if (githubSession.length > 0) {
      console.log(
        `Found ${githubSession.length} GitHub user_session cookie(s):`,
      );
      githubSession.forEach((cookie, i) => {
        console.log(`  ${i + 1}. Browser: ${cookie.meta.browser}`);
        console.log(
          `     Profile: ${cookie.meta.file?.split("/").slice(-2, -1)[0] || "Default"}`,
        );
        console.log(`     Expires: ${cookie.expiry}`);
        console.log(`     Decrypted: ${cookie.meta.decrypted}`);
      });
    } else {
      console.log("No GitHub user_session cookies found");
    }
  } catch (error) {
    console.error("Error retrieving cookies:", error);
  }

  // 2. Wildcard search
  console.log("\n📌 Example 2: Wildcard search for all cookies");
  console.log("-".repeat(40));
  try {
    const allGoogleCookies = await getCookie({
      name: "%", // Wildcard for any name
      domain: "google.com",
    });

    if (allGoogleCookies.length > 0) {
      // Group by cookie name
      const cookieNames = [...new Set(allGoogleCookies.map((c) => c.name))];
      console.log(`Found ${allGoogleCookies.length} Google cookies:`);
      console.log(`Unique cookie names (${cookieNames.length}):`);
      cookieNames.slice(0, 10).forEach((name) => {
        const count = allGoogleCookies.filter((c) => c.name === name).length;
        console.log(`  - ${name} (${count} instance${count > 1 ? "s" : ""})`);
      });
      if (cookieNames.length > 10) {
        console.log(`  ... and ${cookieNames.length - 10} more`);
      }
    } else {
      console.log("No Google cookies found");
    }
  } catch (error) {
    console.error("Error retrieving cookies:", error);
  }

  // 3. Browser-specific queries
  console.log("\n📌 Example 3: Browser-specific strategies");
  console.log("-".repeat(40));

  const browsers = ["chrome", "firefox", "safari"];
  for (const browser of browsers) {
    try {
      const strategy = CookieStrategyFactory.createStrategy(browser);
      const cookies = await strategy.queryCookies({
        name: "%",
        domain: "github.com",
      });

      if (cookies.length > 0) {
        console.log(
          `✓ ${browser.toUpperCase()}: Found ${cookies.length} GitHub cookies`,
        );
      } else {
        console.log(
          `✗ ${browser.toUpperCase()}: No GitHub cookies or browser not available`,
        );
      }
    } catch (_error) {
      console.log(`✗ ${browser.toUpperCase()}: Not available on this system`);
    }
  }

  // 4. Composite strategy (all browsers)
  console.log("\n📌 Example 4: Composite strategy (query all browsers)");
  console.log("-".repeat(40));
  try {
    const compositeStrategy = CookieStrategyFactory.createStrategy();
    const allCookies = await compositeStrategy.queryCookies({
      name: "%",
      domain: "github.com",
    });

    // Group by browser
    const browserGroups = allCookies.reduce(
      (acc, cookie) => {
        const browser = cookie.meta.browser || "Unknown";
        if (!acc[browser]) {
          acc[browser] = [];
        }
        acc[browser].push(cookie);
        return acc;
      },
      {} as Record<string, typeof allCookies>,
    );

    console.log("Cookies found across all browsers:");
    Object.entries(browserGroups).forEach(([browser, cookies]) => {
      const uniqueNames = [...new Set(cookies.map((c) => c.name))];
      console.log(
        `  ${browser}: ${cookies.length} cookies (${uniqueNames.length} unique names)`,
      );
    });
  } catch (error) {
    console.error("Error with composite strategy:", error);
  }

  // 5. Session vs Persistent cookies
  console.log("\n📌 Example 5: Session vs Persistent cookies");
  console.log("-".repeat(40));
  try {
    const allCookies = await getCookie({
      name: "%",
      domain: "google.com",
    });

    const sessionCookies = allCookies.filter(
      (c) =>
        c.expiry === "Infinity" || c.expiry === undefined || c.expiry === null,
    );
    const persistentCookies = allCookies.filter(
      (c) => c.expiry && c.expiry !== "Infinity",
    );

    console.log(`Session cookies: ${sessionCookies.length}`);
    console.log(`Persistent cookies: ${persistentCookies.length}`);

    if (persistentCookies.length > 0) {
      // Find the cookie expiring soonest
      const cookiesWithDates = persistentCookies.filter(
        (c): c is typeof c & { expiry: Date } => c.expiry instanceof Date,
      );
      const soonest = cookiesWithDates.sort((a, b) => {
        const dateA = a.expiry.getTime();
        const dateB = b.expiry.getTime();
        return dateA - dateB;
      })[0];

      if (soonest) {
        const daysUntilExpiry = Math.ceil(
          (soonest.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        console.log(
          `Cookie expiring soonest: ${soonest.name} (${daysUntilExpiry} days)`,
        );
      }
    }
  } catch (error) {
    console.error("Error analyzing cookies:", error);
  }

  // 6. Performance measurement
  console.log("\n📌 Example 6: Performance measurement");
  console.log("-".repeat(40));

  const iterations = 5;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await getCookie({
      name: "%",
      domain: "github.com",
    });
    const elapsed = Date.now() - start;
    times.push(elapsed);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`Query performance (${iterations} iterations):`);
  console.log(`  Average: ${avgTime.toFixed(2)}ms`);
  console.log(`  Min: ${minTime}ms`);
  console.log(`  Max: ${maxTime}ms`);

  console.log(`\n${"=".repeat(50)}`);
  console.log("✅ Demonstration complete!");
}

// Run the demonstration
demonstrateFeatures().catch(console.error);
