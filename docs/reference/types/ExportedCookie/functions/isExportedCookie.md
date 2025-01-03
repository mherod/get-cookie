[**@mherod/get-cookie v2.1.1**](../../../index.html)

---

# Function: isExportedCookie()

> **isExportedCookie**(`obj`): `obj is ExportedCookie`

Defined in: [types/ExportedCookie.ts:133](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/ExportedCookie.ts#L133)

Type guard to check if an object matches the ExportedCookie interface

## Parameters

### obj

`unknown`

The object to check

## Returns

`obj is ExportedCookie`

True if the object is a valid ExportedCookie, false otherwise

## Example

```typescript
import { isExportedCookie } from "get-cookie";

// Valid cookie
const validCookie = {
  domain: "example.com",
  name: "sessionId",
  value: "abc123",
  expiry: new Date(),
};
console.log(isExportedCookie(validCookie)); // true

// Invalid examples
console.log(
  isExportedCookie({
    domain: "example.com",
    name: "test",
  }),
); // false - missing value

console.log(
  isExportedCookie({
    domain: 123,
    name: "test",
    value: "abc",
  }),
); // false - invalid domain type

console.log(isExportedCookie(null)); // false
```
