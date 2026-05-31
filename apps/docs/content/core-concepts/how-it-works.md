---
title: How It Works
description: The data flow from OpenAPI spec to running UI.
---

# How It Works

UIGen transforms an API spec into a running frontend through a pipeline of discrete steps. Understanding this pipeline helps you know where to customise behaviour and how to debug unexpected output.

## Data flow

```
OpenAPI Spec (YAML/JSON)
        │
        ▼
┌───────────────┐
│  Reconciler   │  Merges `.uigen/config.yaml` annotations
│               │  onto the spec (auth, charts, WebSockets, labels)
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Adapter    │  Parses the spec, resolves $refs,
│               │  normalises OpenAPI 3.x / Swagger 2.0
└───────┬───────┘
        │
        ▼
┌───────────────┐
│      IR       │  Intermediate Representation:
│               │  a framework-agnostic data model
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  React SPA    │  Reads the IR from window.__UIGEN_CONFIG__,
│               │  renders views, forms, auth, and layout
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  API Proxy    │  Forwards HTTP and WebSocket traffic to
│               │  your real backend, injects auth transparently
└───────────────┘
```

## Step 1: Config reconciliation

Before parsing, UIGen merges annotations from `.uigen/config.yaml` onto the OpenAPI document. This is where most customization lives: labels, OAuth, charts, WebSocket paths, layouts, and overrides.

The source spec on disk stays unchanged. Reconciliation happens in memory at serve time.

See [Config Reconciliation](/docs/core-concepts/config-reconciliation) for details.

## Step 2: Adapter

The adapter reads the reconciled spec and produces the IR. UIGen ships two adapters:

- **OpenAPI 3.x adapter**: handles OpenAPI 3.0 and 3.1 documents
- **Swagger 2.0 adapter**: handles Swagger 2.0 (formerly OpenAPI 2.0) documents

The adapter resolves all `$ref` references, detects view hints (list, detail, create, update, delete, search, wizard, action), infers pagination strategies, and extracts authentication schemes.

See [Adapters](/docs/core-concepts/adapters) for details.

## Step 3: Intermediate Representation (IR)

The IR is a plain TypeScript object that describes the entire UI in framework-agnostic terms. It contains:

- **Resources**: the entities in your API (e.g. `users`, `products`)
- **Operations**: the HTTP endpoints for each resource, with view hints and optional `websocketConfig`
- **Schema nodes**: the field types, labels, validations, and UI hints for each field
- **Auth config**: the authentication schemes and login endpoints
- **Dashboard config**: widgets and resource counts for the overview page

The IR is serialised as JSON and injected into the React SPA as `window.__UIGEN_CONFIG__` at startup.

See [Intermediate Representation](/docs/core-concepts/intermediate-representation) for the full type definitions.

## Step 4: React SPA

The React SPA reads the IR from `window.__UIGEN_CONFIG__` and renders the UI. It uses:

- **React Router** for URL navigation and browser history
- **TanStack Query** for data fetching, caching, mutations, and WebSocket cache merges
- **TanStack Table** for sortable, paginated data tables
- **React Hook Form + Zod** for form state and validation
- **shadcn/ui** for accessible, pre-styled components

The SPA is served by the CLI's built-in HTTP server.

## Step 5: API Proxy

All API calls from the SPA go through the CLI's built-in proxy at `/api/*`. The proxy:

- Forwards HTTP requests to the target server (from the spec's `servers` field, or `--proxy-base`)
- Forwards WebSocket upgrades on `/api/ws/...` to the same target
- Injects authentication headers transparently (Bearer token, API Key, HTTP Basic)
- Strips UIGen-specific headers and query parameters before forwarding

This means the SPA never makes direct cross-origin requests (the proxy handles CORS).

See [Live Data & WebSockets](/docs/guides/live-data-websockets) and [uigen serve](/docs/cli-reference/serve).

## Two serving modes

The CLI operates in two modes depending on how it was installed:

| Mode | When | How |
|---|---|---|
| **Dev mode** | Running from the monorepo (no `node_modules` renderer) | Starts a Vite dev server with HMR |
| **Static mode** | Installed via npm/npx | Serves the pre-built `dist/` with a plain Node.js HTTP server |

Both modes expose the same URL and behaviour. The difference is internal.

## Serve targets

The CLI can host the React SPA for the browser or a desktop shell:

| Target | Flag | Description |
|---|---|---|
| **Web** | `--target web` (default) | Open `http://localhost:<port>` in your browser |
| **Electron** | `--target electron` | Open a desktop window via `@uigen-dev/target-electron` |

Renderers and targets are separate concepts. `--renderer` selects the UI framework (`react` today). `--target` selects how that UI is hosted. See [Electron Target](/docs/cli-reference/electron-target).
