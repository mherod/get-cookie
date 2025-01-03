[**@mherod/get-cookie v2.1.1**](../../index.html)

---

# Function: getCookie()

> **getCookie**(): `Promise`\<(`cookieSpec`) => `Promise`\<[`ExportedCookie`](../../types/ExportedCookie/interfaces/ExportedCookie.md)[]\>\>

Defined in: [core/cookies/dynamicImports.ts:18](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/core/cookies/dynamicImports.ts#L18)

Dynamic import for the getCookie function

## Returns

`Promise`\<(`cookieSpec`) => `Promise`\<[`ExportedCookie`](../../types/ExportedCookie/interfaces/ExportedCookie.md)[]\>\>

Promise resolving to the getCookie function

## Example

```typescript
const getCookieFn = await getCookie();
const cookies = await getCookieFn({ domain: "example.com" });
// Returns: [{ name: 'sessionId', value: 'abc123', domain: 'example.com' }, ...]
```
