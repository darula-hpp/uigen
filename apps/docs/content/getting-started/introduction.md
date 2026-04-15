---
title: Introduction
description: What UIGen is, what it does, and who it's for.
---

# Introduction

UIGen is a runtime frontend generator for OpenAPI-described APIs. Point it at any OpenAPI 3.x or Swagger 2.0 spec and it serves a fully functional, interactive frontend: tables, forms, detail views, authentication, search, and more, with zero boilerplate and zero code to write.

## What UIGen does

UIGen reads your API spec and generates a complete UI at runtime:

- **List views**: paginated, sortable tables for every collection endpoint
- **Detail views**: read-only record pages with related resource links
- **Create / edit forms**: validated forms derived from request body schemas
- **Search**: global and per-resource filtered search using query parameters from the spec
- **Dashboard**: auto-generated overview with resource counts and quick links
- **Multi-step wizards**: triggered automatically for large or nested forms
- **Authentication**: Bearer token, API Key, HTTP Basic, and credential-based login, all auto-detected from `securitySchemes`

All API calls are live (UIGen proxies requests to your real backend, so there is no mocking and no stub data).

## Who it's for

UIGen is useful for:

- **API developers** who want an instant admin UI or internal tool without building a frontend
- **Teams** that need a quick way to explore and test a new API
- **Prototypers** who want to demo an API to stakeholders without writing UI code

## How it works

UIGen parses your spec into an Intermediate Representation (IR), then uses that IR to drive a React SPA. The CLI injects the IR into the app at startup and starts a local server.

```
OpenAPI Spec → Adapter → IR → React SPA → Your API
```

See [How It Works](/docs/core-concepts/how-it-works) for a deeper look at the data flow.

## Packages

UIGen ships as three packages:

| Package | Purpose |
|---|---|
| `@uigen-dev/cli` | The `uigen serve` command (the fastest way to get started) |
| `@uigen-dev/core` | Framework-agnostic adapters and IR (use this to build your own renderer) |
| `@uigen-dev/react` | The React renderer (the default UI layer) |

## Next steps

- [Quick Start](/docs/getting-started/quick-start): run UIGen in under a minute
- [Installation](/docs/getting-started/installation): install the packages that fit your use case
