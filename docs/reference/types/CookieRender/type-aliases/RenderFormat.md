[**@mherod/get-cookie v2.1.1**](../../../index.html)

---

# Type Alias: RenderFormat

> **RenderFormat**: `"merged"` \| `"grouped"`

Defined in: [types/CookieRender.ts:17](https://github.com/mherod/get-cookie/blob/f162cf080e158f18fe4a3d39249851b82b6fc5ad/src/types/CookieRender.ts#L17)

The format to use when rendering cookies

## Example

```typescript
import { RenderFormat } from "get-cookie";

// Merged format - combines all cookies into a single string
const mergedFormat: RenderFormat = "merged";
// Result: "sessionId=abc123; theme=dark"

// Grouped format - groups cookies by source file
const groupedFormat: RenderFormat = "grouped";
// Result: ["Chrome/Cookies: sessionId=abc123", "Firefox/cookies.sqlite: theme=dark"]
```
