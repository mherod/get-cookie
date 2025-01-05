# Automation Guide 🤖

Learn how to automate tasks with get-cookie.

## Shell Scripts

### Basic Automation

```bash
#!/bin/bash

# Get auth cookie for API requests
AUTH_COOKIE=$(get-cookie auth api.example.com)

# Use cookie in curl requests
curl -H "Cookie: auth=$AUTH_COOKIE" https://api.example.com/data

# Export multiple cookies
get-cookie % example.com --output json > cookies.json
```

### Error Handling

```bash
#!/bin/bash
set -e

function get_auth_cookie() {
    local domain=$1
    local cookie

    if ! cookie=$(get-cookie auth "$domain"); then
        echo "Failed to get auth cookie" >&2
        return 1
    }

    if [ -z "$cookie" ]; then
        echo "No auth cookie found" >&2
        return 1
    }

    echo "$cookie"
}

# Usage
if cookie=$(get_auth_cookie "example.com"); then
    echo "Cookie found: $cookie"
else
    echo "Error: $?"
    exit 1
fi
```

## Node.js Scripts

### Automation Class

```typescript
// src/automation/CookieAutomation.ts
import { getCookie, ExportedCookie } from "@mherod/get-cookie";

export class CookieAutomation {
  private cookies: Map<string, ExportedCookie> = new Map();

  async initialize(domain: string) {
    const cookies = await getCookie({
      name: "%",
      domain,
      removeExpired: true,
    });

    cookies.forEach((cookie) => {
      this.cookies.set(cookie.name, cookie);
    });
  }

  getCookieValue(name: string): string {
    return this.cookies.get(name)?.value ?? "";
  }

  getCookieHeader(): string {
    return Array.from(this.cookies.values())
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  }

  async refreshCookies(domain: string) {
    await this.initialize(domain);
  }
}
```

### API Automation

```typescript
// src/automation/ApiAutomation.ts
import { CookieAutomation } from "./CookieAutomation";

export class ApiAutomation {
  private cookies: CookieAutomation;

  constructor(private baseUrl: string) {
    this.cookies = new CookieAutomation();
  }

  async setup() {
    const domain = new URL(this.baseUrl).hostname;
    await this.cookies.initialize(domain);
  }

  async makeRequest(path: string) {
    return fetch(`${this.baseUrl}${path}`, {
      headers: {
        Cookie: this.cookies.getCookieHeader(),
      },
    });
  }

  async refreshAuth() {
    const domain = new URL(this.baseUrl).hostname;
    await this.cookies.refreshCookies(domain);
  }
}
```

## Task Automation

### GitHub Actions

```yaml
# .github/workflows/automation.yml
name: Cookie Automation
on:
  schedule:
    - cron: "0 */6 * * *" # Every 6 hours

jobs:
  automate:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install Dependencies
        run: pnpm install

      - name: Run Automation
        run: node scripts/automate.js
        env:
          DEBUG: "1"
```

### Scheduled Tasks

```typescript
// scripts/scheduled-tasks.ts
import { CronJob } from "cron";
import { CookieAutomation } from "../src/automation/CookieAutomation";

const automation = new CookieAutomation();

// Refresh cookies every hour
new CronJob("0 * * * *", async () => {
  try {
    await automation.refreshCookies("example.com");
    console.log("Cookies refreshed");
  } catch (error) {
    console.error("Failed to refresh cookies:", error);
  }
}).start();
```

## Monitoring & Logging

### Winston Logger

```typescript
// src/automation/logger.ts
import winston from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: "automation.log",
    }),
  ],
});

// Usage in automation
logger.info("Cookie refresh", {
  domain: "example.com",
  cookieCount: cookies.size,
});
```

### Metrics Collection

```typescript
// src/automation/metrics.ts
import { Gauge } from "prom-client";

export const cookieMetrics = {
  cookieCount: new Gauge({
    name: "cookie_count",
    help: "Number of valid cookies",
    labelNames: ["domain"],
  }),

  refreshTime: new Gauge({
    name: "cookie_refresh_time",
    help: "Time taken to refresh cookies",
    labelNames: ["domain"],
  }),
};

// Usage in automation
const startTime = Date.now();
await automation.refreshCookies("example.com");
cookieMetrics.refreshTime.labels("example.com").set(Date.now() - startTime);
```

## Error Recovery

### Retry Logic

```typescript
// src/automation/retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError;
}

// Usage
await withRetry(() => automation.refreshCookies("example.com"));
```

### Health Checks

```typescript
// src/automation/health.ts
export class HealthCheck {
  private lastSuccess: Date | null = null;
  private failures = 0;

  recordSuccess() {
    this.lastSuccess = new Date();
    this.failures = 0;
  }

  recordFailure() {
    this.failures++;
  }

  isHealthy(): boolean {
    if (!this.lastSuccess) return false;

    const timeSinceSuccess = Date.now() - this.lastSuccess.getTime();
    return timeSinceSuccess < 3600000 && this.failures < 3;
  }
}

// Usage
const health = new HealthCheck();
try {
  await automation.refreshCookies("example.com");
  health.recordSuccess();
} catch (error) {
  health.recordFailure();
  if (!health.isHealthy()) {
    await sendAlert("Cookie automation unhealthy");
  }
}
```

## Best Practices

1. **Error Handling**

   - Implement retry logic
   - Log all failures
   - Set up alerts
   - Use health checks

2. **Security**

   - Rotate credentials
   - Secure cookie storage
   - Monitor access patterns
   - Clean up regularly

3. **Performance**

   - Cache when possible
   - Use exponential backoff
   - Monitor timing
   - Optimize refresh intervals

4. **Maintenance**
   - Regular health checks
   - Update dependencies
   - Monitor browser updates
   - Keep logs rotated
