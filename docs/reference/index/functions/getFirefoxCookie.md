[**@mherod/get-cookie v2.1.1**](../../index.html)

---

# Function: getFirefoxCookie()

> **getFirefoxCookie**(): `Promise`\<(`cookieSpec`) => `Promise`\<[`ExportedCookie`](../../types/ExportedCookie/interfaces/ExportedCookie.md)[]\>\>

Defined in: [core/cookies/dynamicImports.ts:52](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/core/cookies/dynamicImports.ts#L52)

Dynamic import for Firefox-specific cookie retrieval

## Returns

`Promise`\<(`cookieSpec`) => `Promise`\<[`ExportedCookie`](../../types/ExportedCookie/interfaces/ExportedCookie.md)[]\>\>

Promise resolving to the getFirefoxCookie function

## Example

```typescript
const firefoxCookieFn = await getFirefoxCookie();
const cookies = await firefoxCookieFn({ path: "/api" });
// Returns Firefox-format cookies: [{ name: 'token', value: 'def456', path: '/api' }, ...]
```
