[**@mherod/get-cookie v2.1.1**](../../../index.html)

---

# Interface: CookieSpec

Defined in: [types/CookieSpec.ts:27](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieSpec.ts#L27)

Specification for identifying a cookie by its domain and name

## Example

```typescript
import { CookieSpec } from "get-cookie";

// Basic cookie specification
const cookieSpec: CookieSpec = {
  domain: "example.com",
  name: "sessionId",
};

// Using wildcards
const allCookies: CookieSpec = {
  domain: "example.com",
  name: "*", // Match all cookies
};

// Subdomain specification
const apiCookies: CookieSpec = {
  domain: "api.example.com",
  name: "auth",
};
```

## Properties

### domain

> **domain**: `string`

Defined in: [types/CookieSpec.ts:29](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieSpec.ts#L29)

The domain the cookie belongs to

---

### name

> **name**: `string`

Defined in: [types/CookieSpec.ts:31](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieSpec.ts#L31)

The name of the cookie
