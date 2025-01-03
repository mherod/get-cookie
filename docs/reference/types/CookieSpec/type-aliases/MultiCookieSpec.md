[**@mherod/get-cookie v2.1.1**](../../../index.html)

---

# Type Alias: MultiCookieSpec

> **MultiCookieSpec**: [`CookieSpec`](../interfaces/CookieSpec.md) \| [`CookieSpec`](../interfaces/CookieSpec.md)[]

Defined in: [types/CookieSpec.ts:85](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieSpec.ts#L85)

Type representing either a single cookie specification or an array of specifications

## Example

```typescript
import { MultiCookieSpec } from "get-cookie";

// Single cookie spec
const single: MultiCookieSpec = {
  domain: "example.com",
  name: "sessionId",
};

// Multiple cookie specs
const multiple: MultiCookieSpec = [
  { domain: "example.com", name: "sessionId" },
  { domain: "api.example.com", name: "authToken" },
  { domain: "app.example.com", name: "theme" },
];

// Using with cookie query functions
const cookies = await getCookie(multiple); // Will fetch all specified cookies
```
