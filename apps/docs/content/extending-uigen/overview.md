---
title: Extending UIGen
description: Build your own renderer on top of UIGen's framework-agnostic core.
---

# Extending UIGen

UIGen is designed to be extended. The core IR is framework-agnostic, which means you can build a renderer for any UI framework — Svelte, Vue, Angular, or anything else — using `@uigen-dev/core` as the only required dependency.

## Architecture

The extension point is the IR. Your renderer:

1. Receives the IR from `window.__UIGEN_CONFIG__` (injected by the CLI)
2. Reads `ir.resources`, `ir.auth`, `ir.dashboard`, and `ir.servers`
3. Renders the appropriate UI for each resource and operation

The CLI handles spec parsing, IR injection, and the API proxy. Your renderer only needs to handle the UI layer.

## Required dependency

```bash
npm install @uigen-dev/core
```

`@uigen-dev/core` provides the TypeScript types for the IR, which you need to build a type-safe renderer.

## Minimal renderer example

```typescript
import type { UIGenApp } from '@uigen-dev/core';

const ir = window.__UIGEN_CONFIG__ as UIGenApp;

// Render a simple list of resources
for (const resource of ir.resources) {
  console.log(`Resource: ${resource.name}`);
  for (const op of resource.operations) {
    console.log(`  ${op.method} ${op.path} → ${op.viewHint}`);
  }
}
```

## Serving your renderer

Pass your renderer's entry point to the CLI using `--renderer`:

```bash
uigen serve ./openapi.yaml --renderer my-renderer
```

The CLI looks for `@uigen-dev/my-renderer` in `node_modules`. Your renderer package must export a `dist/index.html` that the CLI can serve.

## Planned renderer packages

- **`@uigen-dev/svelte`** — Svelte renderer (planned, Phase 4)
- **`@uigen-dev/vue`** — Vue 3 renderer (planned, Phase 4)

See the [Roadmap](/docs/roadmap/index) for the timeline.

## Community renderers

If you build a renderer for UIGen, open a pull request to add it to this page.
