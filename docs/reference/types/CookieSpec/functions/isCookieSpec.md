[**@mherod/get-cookie v2.1.1**](../../../index.html)

---

# Function: isCookieSpec()

> **isCookieSpec**(`obj`): `obj is CookieSpec`

Defined in: [types/CookieSpec.ts:56](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieSpec.ts#L56)

Type guard to check if an object matches the CookieSpec interface

## Parameters

### obj

`unknown`

The object to check

## Returns

`obj is CookieSpec`

True if the object is a valid CookieSpec, false otherwise

## Example

```typescript
import { isCookieSpec } from "get-cookie";

// Valid cookie spec
const validSpec = { domain: "example.com", name: "sessionId" };
if (isCookieSpec(validSpec)) {
  console.log("Valid cookie spec:", validSpec.domain);
}

// Invalid examples
console.log(isCookieSpec({ domain: 123, name: "test" })); // false
console.log(isCookieSpec({ domain: "example.com" })); // false
console.log(isCookieSpec(null)); // false
```
