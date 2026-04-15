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
│    Adapter    │  Parses the spec, resolves $refs,
│               │  normalises OpenAPI 3.x / Swagger 2.0
└───────┬───────┘
        │
        ▼
┌───────────────┐
│      IR       │  Intermediate Representation —
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
│  API Proxy    │  Forwards live requests to your real backend,
│               │  injects auth headers transparently
└───────────────┘
```

## Step 1: Adapter

The adapter reads the raw spec string and produces the IR. UIGen ships two adapters:

- **OpenAPI 3.x adapter** — handles OpenAPI 3.0 and 3.1 documents
- **Swagger 2.0 adapter** — handles Swagger 2.0 (formerly OpenAPI 2.0) documents

The adapter resolves all `$ref` references, detects view hints (list, detail, create, update, delete, search, wizard, action), infers pagination strategies, and extracts authentication schemes.

See [Adapters](/docs/core-concepts/adapters) for details.

## Step 2: Intermediate Representation (IR)

The IR is a plain TypeScript object that describes the entire UI in framework-agnostic terms. It contains:

- **Resources** — the entities in your API (e.g. `users`, `products`)
- **Operations** — the HTTP endpoints for each resource, with view hints
- **Schema nodes** — the field types, labels, validations, and UI hints for each field
- **Auth config** — the authentication schemes and login endpoints
- **Dashboard config** — widgets and resource counts for the overview page

The IR is serialised as JSON and injected into the React SPA as `window.__UIGEN_CONFIG__` at startup.

See [Intermediate Representation](/docs/core-concepts/intermediate-representation) for the full type definitions.

## Step 3: React SPA

The React SPA reads the IR from `window.__UIGEN_CONFIG__` and renders the UI. It uses:

- **React Router** for URL navigation and browser history
- **TanStack Query** for data fetching, caching, and mutations
- **TanStack Table** for sortable, paginated data tables
- **React Hook Form + Zod** for form state and validation
- **shadcn/ui** for accessible, pre-styled components

The SPA is served by the CLI's built-in HTTP server.

## Step 4: API Proxy

All API calls from the SPA go through the CLI's built-in proxy at `/api/*`. The proxy:

- Forwards requests to the target server (from the spec's `servers` field, or `--proxy-base`)
- Injects authentication headers transparently (Bearer token, API Key, HTTP Basic)
- Strips UIGen-specific headers before forwarding

This means the SPA never makes direct cross-origin requests — the proxy handles CORS.

## Two serving modes

The CLI operates in two modes depending on how it was installed:

| Mode | When | How |
|---|---|---|
| **Dev mode** | Running from the monorepo (no `node_modules` renderer) | Starts a Vite dev server with HMR |
| **Static mode** | Installed via npm/npx | Serves the pre-built `dist/` with a plain Node.js HTTP server |

Both modes expose the same URL and behaviour. The difference is internal.
