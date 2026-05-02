---
title: Installation
description: Install the UIGen packages that fit your use case.
---

# Installation

UIGen ships as three separate packages. Install only what you need.

## `@uigen-dev/cli`

The CLI is the fastest way to get started. Use it to initialize projects, serve generated UIs, and configure annotations visually.

```bash
npm install -g @uigen-dev/cli
```

Or use it without installing via `npx`:

```bash
# Initialize a new project
npx @uigen-dev/cli init my-admin-ui

# Serve a generated UI
npx @uigen-dev/cli serve ./openapi.yaml

# Open the config GUI
npx @uigen-dev/cli config ./openapi.yaml
```

**Use this when** you want to spin up a UI for an existing API without writing any code, or when you want a complete project scaffold with configuration and AI agent skills.

### CLI commands

- `init` - Initialize a new UIGen project with scaffolded structure
- `serve` - Start a development server with the generated UI
- `config` - Open a visual GUI for managing annotations

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

- [Quick Start](/docs/getting-started/quick-start): create a project and run UIGen in under a minute
- [CLI Reference: init](/docs/cli-reference/init): initialize new projects
- [CLI Reference: serve](/docs/cli-reference/serve): all available flags for `uigen serve`
- [CLI Reference: config](/docs/cli-reference/config): visual configuration GUI
- [Override System](/docs/override-system/overview): customise the generated UI
