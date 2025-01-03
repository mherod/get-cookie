[**@mherod/get-cookie v2.1.1**](../../index.html)

---

# Function: getGroupedRenderedCookies()

> **getGroupedRenderedCookies**(): `Promise`\<(`cookieSpec`) => `Promise`\<`string`[]\>\>

Defined in: [core/cookies/dynamicImports.ts:69](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/core/cookies/dynamicImports.ts#L69)

Dynamic import for retrieving grouped and rendered cookies

## Returns

`Promise`\<(`cookieSpec`) => `Promise`\<`string`[]\>\>

Promise resolving to the getGroupedRenderedCookies function

## Example

```typescript
const groupedCookiesFn = await getGroupedRenderedCookies();
const cookieStrings = await groupedCookiesFn({ domain: "example.com" });
// Returns: ['sessionId=abc123; Domain=example.com', 'auth=xyz789; Domain=example.com']
```
