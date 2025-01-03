[**@mherod/get-cookie v2.1.1**](../../index.html)

---

# Function: getChromeCookie()

> **getChromeCookie**(): `Promise`\<(`cookieSpec`) => `Promise`\<[`ExportedCookie`](../../types/ExportedCookie/interfaces/ExportedCookie.md)[]\>\>

Defined in: [core/cookies/dynamicImports.ts:35](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/core/cookies/dynamicImports.ts#L35)

Dynamic import for Chrome-specific cookie retrieval

## Returns

`Promise`\<(`cookieSpec`) => `Promise`\<[`ExportedCookie`](../../types/ExportedCookie/interfaces/ExportedCookie.md)[]\>\>

Promise resolving to the getChromeCookie function

## Example

```typescript
const chromeCookieFn = await getChromeCookie();
const cookies = await chromeCookieFn({ domain: "example.com", secure: true });
// Returns Chrome-format cookies: [{ name: 'auth', value: 'xyz789', secure: true }, ...]
```
