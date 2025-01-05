# Browser Automation 🎭

Learn how to use get-cookie with Puppeteer and Playwright for browser automation.

## Puppeteer Integration

### Basic Setup

```typescript
import puppeteer from "puppeteer";
import { getCookie } from "@mherod/get-cookie";

async function setupBrowser() {
  // Get authentication cookies
  const cookies = await getCookie({
    name: "%",
    domain: "example.com",
  });

  // Launch browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set cookies before navigation
  await Promise.all(
    cookies.map((cookie) =>
      page.setCookie({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: "/",
        expires:
          cookie.expiry === "Infinity"
            ? Date.now() + 86400000 // 24 hours
            : new Date(cookie.expiry).getTime() / 1000,
      }),
    ),
  );

  return { browser, page };
}

// Usage
const { browser, page } = await setupBrowser();
await page.goto("https://example.com/dashboard");
// Page is now authenticated
await browser.close();
```

### Reusable Authentication

```typescript
// auth.ts
import { Browser, Page } from "puppeteer";
import { getCookie, ExportedCookie } from "@mherod/get-cookie";

export class BrowserAuthenticator {
  private cookies: ExportedCookie[] = [];

  async initialize(domain: string) {
    this.cookies = await getCookie({
      name: "%",
      domain,
      removeExpired: true,
    });
  }

  async authenticatePage(page: Page) {
    if (this.cookies.length === 0) {
      throw new Error("No cookies available. Call initialize() first.");
    }

    await Promise.all(
      this.cookies.map((cookie) =>
        page.setCookie({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: "/",
          expires: this.getExpiryTimestamp(cookie.expiry),
        }),
      ),
    );
  }

  private getExpiryTimestamp(expiry: Date | "Infinity"): number {
    if (expiry === "Infinity") {
      return Date.now() + 86400000; // 24 hours
    }
    return new Date(expiry).getTime() / 1000;
  }
}

// Usage
const auth = new BrowserAuthenticator();
await auth.initialize("example.com");

const browser = await puppeteer.launch();
const page = await browser.newPage();
await auth.authenticatePage(page);
```

### Multi-Domain Support

```typescript
// multi-domain-auth.ts
import { getCookie } from "@mherod/get-cookie";
import { Page } from "puppeteer";

async function authenticateForDomains(page: Page, domains: string[]) {
  for (const domain of domains) {
    const cookies = await getCookie({
      name: "%",
      domain,
    });

    await Promise.all(
      cookies.map((cookie) =>
        page.setCookie({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: "/",
        }),
      ),
    );
  }
}

// Usage
const domains = ["api.example.com", "app.example.com"];
await authenticateForDomains(page, domains);
```

## Playwright Integration

### Basic Setup

```typescript
import { chromium } from "playwright";
import { getCookie } from "@mherod/get-cookie";

async function setupPlaywright() {
  // Get authentication cookies
  const cookies = await getCookie({
    name: "%",
    domain: "example.com",
  });

  // Format cookies for Playwright
  const playwrightCookies = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: "/",
    expires:
      cookie.expiry === "Infinity"
        ? Date.now() + 86400000
        : new Date(cookie.expiry).getTime(),
  }));

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Set cookies
  await context.addCookies(playwrightCookies);

  const page = await context.newPage();
  return { browser, context, page };
}

// Usage
const { browser, page } = await setupPlaywright();
await page.goto("https://example.com/dashboard");
await browser.close();
```

### Context Manager

```typescript
// playwright-context.ts
import { BrowserContext, chromium } from "playwright";
import { getCookie } from "@mherod/get-cookie";

export class PlaywrightContextManager {
  private context?: BrowserContext;

  async createAuthenticatedContext(domain: string) {
    const cookies = await getCookie({
      name: "%",
      domain,
    });

    const browser = await chromium.launch();
    this.context = await browser.newContext();

    await this.context.addCookies(
      cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: "/",
        expires: this.getExpiryTimestamp(cookie.expiry),
      })),
    );

    return this.context;
  }

  private getExpiryTimestamp(expiry: Date | "Infinity"): number {
    return expiry === "Infinity"
      ? Date.now() + 86400000
      : new Date(expiry).getTime();
  }
}

// Usage
const manager = new PlaywrightContextManager();
const context = await manager.createAuthenticatedContext("example.com");
const page = await context.newPage();
```

## Testing Integration

### Jest with Puppeteer

```typescript
// jest.setup.ts
import { getCookie } from "@mherod/get-cookie";
import puppeteer from "puppeteer";

let browser: puppeteer.Browser;
let page: puppeteer.Page;

beforeAll(async () => {
  browser = await puppeteer.launch();
  page = await browser.newPage();

  // Set up authentication
  const cookies = await getCookie({
    name: "%",
    domain: "example.com",
  });

  await Promise.all(
    cookies.map((cookie) =>
      page.setCookie({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: "/",
      }),
    ),
  );
});

afterAll(async () => {
  await browser.close();
});

// Test example
test("authenticated page access", async () => {
  await page.goto("https://example.com/dashboard");
  await expect(page.locator("h1")).toHaveText("Welcome back");
});
```

### Playwright Test

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from "@playwright/test";
import { getCookie } from "@mherod/get-cookie";

async function globalSetup() {
  const cookies = await getCookie({
    name: "%",
    domain: "example.com",
  });

  return {
    cookies: cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: "/",
    })),
  };
}

const config: PlaywrightTestConfig = {
  globalSetup,
  use: {
    // Set cookies for all tests
    storageState: {
      cookies: (global as any).cookies || [],
    },
  },
};

export default config;
```

## Best Practices

### Cookie Refresh

```typescript
async function refreshPageCookies(page: Page) {
  // Clear existing cookies
  const client = await page.target().createCDPSession();
  await client.send("Network.clearBrowserCookies");

  // Get fresh cookies
  const cookies = await getCookie({
    name: "%",
    domain: "example.com",
    removeExpired: true,
  });

  // Set new cookies
  await Promise.all(
    cookies.map((cookie) =>
      page.setCookie({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: "/",
      }),
    ),
  );
}
```

### Error Handling

```typescript
async function safeAuthenticate(page: Page) {
  try {
    const cookies = await getCookie({
      name: "%",
      domain: "example.com",
    });

    if (cookies.length === 0) {
      throw new Error("No cookies found");
    }

    await Promise.all(
      cookies.map((cookie) =>
        page
          .setCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: "/",
          })
          .catch((error) => {
            console.error(`Failed to set cookie ${cookie.name}:`, error);
          }),
      ),
    );
  } catch (error) {
    console.error("Authentication failed:", error);
    throw error;
  }
}
```

### Performance Tips

1. **Cache Cookies**

   ```typescript
   const cookieCache = new Map<string, ExportedCookie[]>();

   async function getCachedCookies(domain: string) {
     if (!cookieCache.has(domain)) {
       const cookies = await getCookie({ name: "%", domain });
       cookieCache.set(domain, cookies);
     }
     return cookieCache.get(domain)!;
   }
   ```

2. **Parallel Page Setup**

   ```typescript
   async function setupPages(count: number) {
     const cookies = await getCookie({
       name: "%",
       domain: "example.com",
     });

     const browser = await puppeteer.launch();
     const pages = await Promise.all(
       Array(count)
         .fill(0)
         .map(async () => {
           const page = await browser.newPage();
           await Promise.all(
             cookies.map((cookie) =>
               page.setCookie({
                 name: cookie.name,
                 value: cookie.value,
                 domain: cookie.domain,
                 path: "/",
               }),
             ),
           );
           return page;
         }),
     );

     return { browser, pages };
   }
   ```
