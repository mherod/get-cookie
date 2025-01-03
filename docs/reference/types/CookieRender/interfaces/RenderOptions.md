[**@mherod/get-cookie v2.1.1**](../../../index.html)

---

# Interface: RenderOptions

Defined in: [types/CookieRender.ts:48](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieRender.ts#L48)

Options for rendering cookies

## Example

```typescript
import { RenderOptions } from "get-cookie";

// Basic rendering options
const basicOptions: RenderOptions = {
  format: "merged",
  separator: "; ",
  showFilePaths: false,
};

// Grouped format with file paths
const groupedOptions: RenderOptions = {
  format: "grouped",
  separator: "; ",
  showFilePaths: true,
};

// Custom separator
const customOptions: RenderOptions = {
  format: "merged",
  separator: " && ",
  showFilePaths: false,
};
```

## Properties

### format?

> `optional` **format**: [`RenderFormat`](../type-aliases/RenderFormat.md)

Defined in: [types/CookieRender.ts:50](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieRender.ts#L50)

The format to use when rendering cookies

---

### separator?

> `optional` **separator**: `string`

Defined in: [types/CookieRender.ts:52](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieRender.ts#L52)

The separator to use between cookies

---

### showFilePaths?

> `optional` **showFilePaths**: `boolean`

Defined in: [types/CookieRender.ts:54](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieRender.ts#L54)

Whether to show file paths in the output
