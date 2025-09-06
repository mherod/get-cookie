---
title: Getting Started
description: Learn how to install and use get-cookie
---

# Getting Started

## Installation

Install the package using npm:

```bash
npm install @mherod/get-cookie
```

Or using yarn:

```bash
yarn add @mherod/get-cookie
```

Or using pnpm:

```bash
pnpm add @mherod/get-cookie
```

## Basic Usage

### Using the CLI

The simplest way to get started is using the CLI:

```bash
npx @mherod/get-cookie --domain github.com
```

### Using in Code

```typescript
import { getCookie } from "@mherod/get-cookie";

async function example() {
  const cookies = await getCookie({
    domain: "github.com",
  });

  console.log("Found cookies:", cookies);
}
```

## Platform Support

- **Windows**: Chrome, Edge, Arc, Opera, Opera GX, Firefox
- **macOS**: Chrome, Edge, Arc, Opera, Opera GX, Firefox, Safari
- **Linux**: Chrome, Edge, Arc, Opera, Opera GX, Firefox

## Next Steps

- Check out the [API Reference](/reference/api) for detailed documentation
- Learn about [browser-specific features](/guide/browsers)
- Explore the [architecture overview](/guide/architecture)
- See [CLI usage examples](/guide/cli-usage)
