[**@mherod/get-cookie v2.1.1**](../../../index.html)

---

# Interface: ExportedCookie

Defined in: [types/ExportedCookie.ts:38](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/ExportedCookie.ts#L38)

Interface representing a cookie that has been exported from a browser's storage
Contains all the essential properties of a browser cookie

## Example

```typescript
import { ExportedCookie } from "get-cookie";

// Basic cookie with required fields
const basicCookie: ExportedCookie = {
  domain: "example.com",
  name: "sessionId",
  value: "abc123",
};

// Cookie with expiry and metadata
const detailedCookie: ExportedCookie = {
  domain: "api.example.com",
  name: "authToken",
  value: "xyz789",
  expiry: new Date("2024-12-31"),
  meta: {
    file: "Cookies.sqlite",
    browser: "Firefox",
    decrypted: true,
  },
};

// Cookie with infinite expiry
const persistentCookie: ExportedCookie = {
  domain: "app.example.com",
  name: "preferences",
  value: "theme=dark",
  expiry: "Infinity",
};
```

## Properties

### domain

> **domain**: `string`

Defined in: [types/ExportedCookie.ts:40](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/ExportedCookie.ts#L40)

The domain the cookie belongs to

---

### expiry?

> `optional` **expiry**: `Date` \| `"Infinity"`

Defined in: [types/ExportedCookie.ts:46](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/ExportedCookie.ts#L46)

When the cookie expires (Date object, "Infinity", or undefined)

---

### meta?

> `optional` **meta**: `object`

Defined in: [types/ExportedCookie.ts:48](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/ExportedCookie.ts#L48)

Additional metadata about the cookie

#### Index Signature

\[`key`: `string`\]: `unknown`

#### browser?

> `optional` **browser**: `string`

Browser the cookie was exported from

#### decrypted?

> `optional` **decrypted**: `boolean`

Whether the cookie value was decrypted

#### file?

> `optional` **file**: `string`

Path to the file the cookie was exported from

---

### name

> **name**: `string`

Defined in: [types/ExportedCookie.ts:42](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/ExportedCookie.ts#L42)

The name of the cookie

---

### value

> **value**: `string`

Defined in: [types/ExportedCookie.ts:44](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/ExportedCookie.ts#L44)

The value of the cookie
