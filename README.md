# UIGen

> Point it at an OpenAPI spec. Get a fully functional frontend. Zero boilerplate.

![UIGen Demo](https://github.com/darula-hpp/uigen/raw/main/examples/output.gif)

**⚠️ Disclaimer:** Project not ready for production yet, but we're fast approaching v1.

---

## Getting Started

### Quick Start (npx)

```bash
# Configure your spec (optional but helpful - Includes theme config)
npx @uigen-dev/cli config openapi.yaml

# Serve your UI
npx @uigen-dev/cli serve openapi.yaml
```

Visit `http://localhost:4400` to see your app.

### Try the Example App

```bash
git clone https://github.com/darula-hpp/uigen
cd examples/apps/fastapi/meeting-minutes

# Setup backend (FastAPI + PostgreSQL)
docker compose up -d
docker compose exec app alembic upgrade head

# Test UIGen with the example
cd ../../../  # Back to repo root
pnpm install && pnpm build
pnpm run test:config
pnpm run test:serve
```

---

## What Just Happened?

UIGen transforms your OpenAPI spec into a complete, interactive frontend in seconds. Here's the flow:

```
CLI Command
    |
    v
+----------------+     +----------------+     +----------+     +------+     +--------+     +--------------+
| API Document   |---->| Reconciler     |---->| Adapter  |---->|  IR  |---->| Engine |---->|  React SPA   |
| (YAML/JSON)    |     | (Config Merge) |     | (Parser) |     |      |     |        |     | (served)     |
+----------------+     +----------------+     +----------+     +------+     +--------+     +--------------+
       |                      ^                                                                    |
       |                      |                                                          +---------+
       |               +----------------+                                                v
       |               | Config File    |                                          +-----------+
       |               | (.uigen/       |                                          | API Proxy |---> Real API
       |               |  config.yaml)  |                                          +-----------+
       |               +----------------+
       |
       +---> (Source spec unchanged on disk)
```

UIGen reconciles your config with the spec, then parses it into a framework-agnostic Intermediate Representation containing:
- Resources and their relationships
- Operations (CRUD + custom actions)
- Schemas with validation rules
- Authentication flows
- Pagination strategies

The React renderer reads this IR and generates:
- **Table views** with sorting, filtering, pagination
- **Create & edit forms** with validation
- **Detail views** with related resource links
- **Search interfaces** from query parameters
- **Authentication flows** (Bearer, API Key, HTTP Basic, credential-based login)
- **Multi-step wizards** for complex forms
- **Custom action buttons** for non-CRUD endpoints
- **Dashboard** with resource overview
- **Dark/light theme** toggle

Because the IR is framework-agnostic, you can swap renderers. The same spec works with `@uigen-dev/react`, `@uigen-dev/svelte`, or `@uigen-dev/vue` (coming soon).

---

## Read More

- **[Full Documentation](https://uigen-docs.vercel.app)** - Complete guides, API reference, and examples
- **[Architecture](./ARCHITECTURE.md)** - Deep dive into the IR, adapters, and rendering pipeline

---

## Current Priorities
- Better handling of resources and their relationships
- Layout Config

## License

MIT
