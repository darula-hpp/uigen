---
title: Installation
description: Install the UIGen packages that fit your use case.
---

# Installation

UIGen ships as three separate packages. Install only what you need.

## `@uigen-dev/cli`

The CLI is the fastest way to get started. Use it to serve a generated UI directly from a spec file.

```bash
npm install -g @uigen-dev/cli
```

Or use it without installing via `npx`:

```bash
npx @uigen-dev/cli serve ./openapi.yaml
```

**Use this when** you want to spin up a UI for an existing API without writing any code.

## `@uigen-dev/core`

The framework-agnostic core contains the adapters, IR types, and the `parseSpec` function. It has no UI dependencies.

```bash
npm install @uigen-dev/core
```

**Use this when** you want to build your own renderer on top of UIGen's IR, or when you need to parse a spec programmatically.

```typescript
import { parseSpec } from '@uigen-dev/core';

const ir = await parseSpec(yamlString);
console.log(ir.resources); // all detected resources
```

## `@uigen-dev/react`

The React renderer provides the full UI layer (views, forms, fields, auth, and layout) driven by the IR from `@uigen-dev/core`.

```bash
npm install @uigen-dev/react @uigen-dev/core
```

**Use this when** you want to embed the generated UI inside an existing React application, or when you need to customise the rendering via the [Override System](/docs/override-system/overview).

## Requirements

- Node.js 18 or later
- npm 9 or later (or pnpm / yarn equivalent)

## Next steps

- [Quick Start](/docs/getting-started/quick-start): run UIGen in under a minute
- [CLI Reference](/docs/cli-reference/serve): all available flags for `uigen serve`
- [Override System](/docs/override-system/overview): customise the generated UI
