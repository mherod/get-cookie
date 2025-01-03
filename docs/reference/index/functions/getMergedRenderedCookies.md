[**@mherod/get-cookie v2.1.1**](../../index.html)

---

# Function: getMergedRenderedCookies()

> **getMergedRenderedCookies**(): `Promise`\<(`cookieSpec`, `options`?) => `Promise`\<`string`\>\>

Defined in: [core/cookies/dynamicImports.ts:92](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/core/cookies/dynamicImports.ts#L92)

Dynamic import for retrieving merged and rendered cookies

## Returns

`Promise`\<(`cookieSpec`, `options`?) => `Promise`\<`string`\>\>

Promise resolving to the getMergedRenderedCookies function

## Example

```typescript
const mergedCookiesFn = await getMergedRenderedCookies();
const cookieString = await mergedCookiesFn(
  { domain: "example.com" },
  { separator: "; " },
);
// Returns: "sessionId=abc123; auth=xyz789"
```
