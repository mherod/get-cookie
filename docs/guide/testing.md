# Integration Testing Guide 🧪

Learn how to use get-cookie in your testing workflows.

## Basic Testing Setup

### Installation

```bash
# Add as dev dependency
pnpm add -D @mherod/get-cookie

# Or with npm
npm install --save-dev @mherod/get-cookie

# Or with yarn
yarn add --dev @mherod/get-cookie
```

### Test Helper Function

```typescript
// test/helpers/cookies.ts
import { getCookie } from "@mherod/get-cookie";

export async function getAuthCookie(domain: string): Promise<string> {
  try {
    const cookies = await getCookie({
      name: "auth",
      domain,
      removeExpired: true,
    });
    return cookies[0]?.value ?? "";
  } catch (error) {
    console.error("Failed to get auth cookie:", error);
    return "";
  }
}
```

## Testing Frameworks

### Jest

```typescript
// test/api.test.ts
import { getAuthCookie } from "./helpers/cookies";

describe("API Tests", () => {
  let authCookie: string;

  beforeAll(async () => {
    authCookie = await getAuthCookie("api.example.com");
  });

  test("authenticated request", async () => {
    const response = await fetch("https://api.example.com/me", {
      headers: {
        Cookie: `auth=${authCookie}`,
      },
    });
    expect(response.status).toBe(200);
  });
});
```

### Mocha

```typescript
// test/api.spec.ts
import { getAuthCookie } from "./helpers/cookies";
import { expect } from "chai";

describe("API Tests", () => {
  let authCookie: string;

  before(async () => {
    authCookie = await getAuthCookie("api.example.com");
  });

  it("should make authenticated request", async () => {
    const response = await fetch("https://api.example.com/me", {
      headers: {
        Cookie: `auth=${authCookie}`,
      },
    });
    expect(response.status).to.equal(200);
  });
});
```

## Testing Strategies

### E2E Testing

```typescript
// cypress/support/commands.ts
import { getCookie } from "@mherod/get-cookie";

Cypress.Commands.add("loginWithCookie", async (domain) => {
  const cookies = await getCookie({
    name: "auth",
    domain,
  });

  cookies.forEach((cookie) => {
    cy.setCookie(cookie.name, cookie.value, {
      domain: cookie.domain,
      path: "/",
    });
  });
});

// cypress/e2e/dashboard.cy.ts
describe("Dashboard", () => {
  beforeEach(() => {
    cy.loginWithCookie("example.com");
    cy.visit("/dashboard");
  });

  it("shows user data", () => {
    cy.get("[data-test=user-name]").should("be.visible");
  });
});
```

### API Testing

```typescript
// test/helpers/api.ts
import { getCookie } from "@mherod/get-cookie";

export class ApiClient {
  private baseUrl: string;
  private cookies: string[];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.cookies = [];
  }

  async authenticate() {
    const cookies = await getCookie({
      name: "%",
      domain: new URL(this.baseUrl).hostname,
    });

    this.cookies = cookies.map((c) => `${c.name}=${c.value}`);
  }

  async request(path: string) {
    return fetch(`${this.baseUrl}${path}`, {
      headers: {
        Cookie: this.cookies.join("; "),
      },
    });
  }
}

// test/api/users.test.ts
const api = new ApiClient("https://api.example.com");

beforeAll(async () => {
  await api.authenticate();
});

test("get user profile", async () => {
  const response = await api.request("/me");
  expect(response.status).toBe(200);
});
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Integration Tests
on: [push]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Chrome
        uses: browser-actions/setup-chrome@v1

      - name: Login to Test Account
        run: |
          # Login to test account in Chrome
          ./scripts/login.sh

      - name: Run Tests
        run: |
          pnpm install
          pnpm test
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1
jobs:
  test:
    macos:
      xcode: "14.2.0"
    steps:
      - checkout
      - run:
          name: Setup Test Environment
          command: |
            # Install browsers
            brew install --cask google-chrome firefox

      - run:
          name: Run Tests
          command: |
            pnpm install
            pnpm test
```

## Best Practices

### Cookie Management

1. **Clear Cookies Between Tests**

   ```typescript
   afterEach(async () => {
     // Clear browser cookies
     await clearBrowserCookies();
   });
   ```

2. **Handle Missing Cookies**

   ```typescript
   function assertCookie(cookie?: string) {
     if (!cookie) {
       throw new Error("Required cookie not found");
     }
     return cookie;
   }
   ```

3. **Timeout Handling**

   ```typescript
   const COOKIE_TIMEOUT = 5000;

   async function waitForCookie(domain: string) {
     const startTime = Date.now();
     while (Date.now() - startTime < COOKIE_TIMEOUT) {
       const cookie = await getAuthCookie(domain);
       if (cookie) return cookie;
       await new Promise((r) => setTimeout(r, 100));
     }
     throw new Error("Cookie timeout");
   }
   ```

### Security

1. **Test Account Isolation**

   - Use dedicated test accounts
   - Never use production cookies
   - Rotate test credentials

2. **CI Environment**

   - Use ephemeral browsers
   - Clear state between runs
   - Secure cookie storage

3. **Error Handling**
   ```typescript
   process.on("uncaughtException", (error) => {
     // Clear sensitive data
     clearCookies();
     process.exit(1);
   });
   ```

## Debugging

### Logging

```typescript
const DEBUG = process.env.DEBUG === "1";

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[get-cookie] ${message}`, data);
  }
}
```

### Cookie Inspection

```typescript
function inspectCookie(cookie: any) {
  const { value, ...safeProps } = cookie;
  debugLog("Cookie found:", {
    ...safeProps,
    valueLength: value?.length,
  });
}
```

### Error Tracking

```typescript
class CookieError extends Error {
  constructor(
    message: string,
    public readonly context: any,
  ) {
    super(message);
    this.name = "CookieError";
  }
}

try {
  // Test code
} catch (error) {
  throw new CookieError("Test failed", {
    browser: process.env.BROWSER,
    timestamp: new Date().toISOString(),
  });
}
```
