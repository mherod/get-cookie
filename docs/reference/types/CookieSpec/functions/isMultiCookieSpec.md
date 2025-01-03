[**@mherod/get-cookie v2.1.1**](../../../index.html)

---

# Function: isMultiCookieSpec()

> **isMultiCookieSpec**(`obj`): `obj is MultiCookieSpec`

Defined in: [types/CookieSpec.ts:114](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieSpec.ts#L114)

Type guard to check if an object matches the MultiCookieSpec type

## Parameters

### obj

`unknown`

The object to check

## Returns

`obj is MultiCookieSpec`

True if the object is a valid MultiCookieSpec, false otherwise

## Example

```typescript
import { isMultiCookieSpec } from "get-cookie";

// Single spec check
const single = { domain: "example.com", name: "sessionId" };
console.log(isMultiCookieSpec(single)); // true

// Array of specs check
const multiple = [
  { domain: "example.com", name: "sessionId" },
  { domain: "api.example.com", name: "authToken" },
];
console.log(isMultiCookieSpec(multiple)); // true

// Invalid examples
console.log(isMultiCookieSpec([{ domain: 123, name: "test" }])); // false
console.log(isMultiCookieSpec(null)); // false
console.log(isMultiCookieSpec([null])); // false
```
