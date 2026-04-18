# UIGen — Architecture & Tooling Plan (v2)

A CLI tool installed from npm. Point it at an OpenAPI/Swagger spec and it serves a fully functional frontend with live API calls — zero boilerplate, zero code.

```bash
npx uigen serve --spec ./openapi.yaml
# → Serves a complete, interactive frontend at http://localhost:4400
```

---

## Decisions Locked In

| Decision | Choice |
|---|---|
| **API formats** | OpenAPI 3.x (primary), Swagger 2.0 |
| **UI surfaces** | CRUD forms, tables, detail views, **dashboards**, **search**, **multi-step wizards**, **custom actions** |
| **Distribution** | CLI (`npx uigen`) for zero-config use; `@uigen-dev/core` and `@uigen-dev/react` are independently importable for building on top |
| **Renderers** | React (default), Svelte (planned), Vue 3 (planned) — all driven by the same IR |
| **Styling** | **shadcn/ui** (Radix primitives + Tailwind CSS v4) — opinionated, end-user never touches Tailwind |
| **API calls** | Live — generated frontend calls the spec's endpoints via built-in proxy |

---

## Core Data Flow

```
CLI Command
    │
    ▼
┌──────────────┐     ┌──────────┐     ┌──────┐     ┌────────┐     ┌──────────────┐
│ API Document │────▸│ Adapter  │────▸│  IR  │────▸│ Engine │────▸│   React SPA  │
│ (YAML/JSON)  │     │ (Parser) │     │      │     │        │     │ (served)     │
└──────────────┘     └──────────┘     └──────┘     └────────┘     └──────────────┘
                                                                        │
                                                              ┌─────────┘
                                                              ▼
                                                        ┌───────────┐
                                                        │ API Proxy │──▸ Real API
                                                        └───────────┘
```

The CLI:
1. Reads & parses the spec file
2. Adapts it to the IR
3. Injects the IR as `window.__UIGEN_CONFIG__` into the React SPA's `index.html`
4. **Dev mode** (monorepo): starts a Vite dev server that serves the SPA and proxies `/api/*` to the real backend
5. **Static mode** (npm/npx install): serves the pre-built `dist/` with a plain Node.js HTTP server and a built-in proxy — no Vite required at runtime

---

## Design Patterns

| Pattern | Where | Why |
|---|---|---|
| **Adapter** | Document ingestion | Normalizes OpenAPI 3.x / Swagger 2.0 into IR |
| **Factory** | Component creation | Produces the right widget for a field type |
| **Strategy** | View rendering | Swaps between table, form, detail, dashboard, wizard |
| **Registry** | Component lookup | Central `type → Component` map |
| **Proxy** | API calls | CLI proxies requests to avoid CORS issues |

---

## Internal Representation (IR)

```typescript
interface UIGenApp {
  meta: AppMeta;
  resources: Resource[];
  auth: AuthConfig;              // from securitySchemes
  dashboard: DashboardConfig;
  servers: ServerConfig[];       // environment switching
}

interface ServerConfig {
  url: string;
  description?: string;          // "Production", "Staging", etc.
}

interface AuthConfig {
  schemes: AuthScheme[];         // bearer, apiKey, oauth2, etc.
  globalRequired: boolean;
}

interface Resource {
  name: string;                  // "User", "Product"
  slug: string;                  // "users", "products"
  operations: Operation[];
  schema: SchemaNode;
  relationships: Relationship[]; // links to other resources
  pagination?: PaginationHint;   // detected pagination strategy
}

interface Relationship {
  target: string;                // target resource slug
  type: "hasMany" | "belongsTo";
  path: string;                  // e.g. /users/{id}/orders
}

interface PaginationHint {
  style: "offset" | "cursor" | "page";
  params: Record<string, string>; // e.g. { limit: "limit", offset: "offset" }
}

interface Operation {
  id: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  parameters: Parameter[];
  requestBody?: SchemaNode;
  responses: Record<string, ResponseDescriptor>;
  viewHint: ViewHint;
}

interface SchemaNode {
  type: FieldType;
  key: string;
  label: string;
  required: boolean;
  children?: SchemaNode[];       // object
  items?: SchemaNode;            // array
  enumValues?: string[];
  format?: string;               // date, email, uri, etc.
  validations?: ValidationRule[];
  uiHint?: UIHint;
}

type ViewHint = "list" | "detail" | "create" | "update" | "delete"
              | "search" | "wizard" | "dashboard" | "action";

type FieldType = "string" | "number" | "integer" | "boolean"
              | "object" | "array" | "enum" | "date" | "file";
```

---

## View Types

### 1. List / Table View
Auto-generated from `GET /resources`. Columns from response schema. Pagination auto-detected (offset, cursor, or page-based). Sorting, inline actions (edit, delete), and navigation to related resources.

### 2. Detail View
Auto-generated from `GET /resources/{id}`. Read-only fields with proper formatting. Shows related resource links (e.g. User → Orders).

### 3. Create / Edit Forms
Auto-generated from `POST` and `PUT`/`PATCH` endpoints. Validation from spec constraints (`minLength`, `pattern`, `minimum`, etc.).

### 4. Search
Global search bar + per-resource filtered search using query parameters defined in the spec.

### 5. Dashboard
Overview page: all resources with record counts, quick links, recent activity. Auto-generated.

### 6. Multi-Step Wizard
Triggered when a `POST` body has >8 fields or nested objects. Groups fields into logical steps.

### 7. Custom Actions
Non-CRUD operations like `POST /users/{id}/activate` or `POST /orders/{id}/refund`. Rendered as action buttons on the detail view with a confirmation dialog and optional input form.

### 8. Authentication
Auto-generated from `securitySchemes`: token input for Bearer/API Key, login form for OAuth with PKCE flow. Persists credentials in session storage.

---

## CLI Architecture

```
uigen serve --spec ./openapi.yaml [--port 4400] [--proxy-base http://api.example.com]
```

Built with **Commander.js**. The `serve` command:

1. Reads the spec file (YAML/JSON auto-detected)
2. Runs it through the adapter registry → produces IR
3. Injects the IR into the React SPA's `index.html` as `window.__UIGEN_CONFIG__`
4. **Dev mode** (monorepo, no `node_modules` renderer): starts a Vite dev server, configures Vite proxy to forward `/api/*` to the real server
5. **Static mode** (npm/npx install): serves the pre-built `dist/renderer/` with a plain Node.js HTTP server; a built-in proxy forwards `/api/*` to the real server — Vite is not required at runtime

Future commands:
- `uigen generate` — outputs static build
- `uigen validate` — checks spec compatibility

---

## Project Structure

```
uigen/
├── packages/
│   ├── core/                      # Framework-agnostic: adapters, IR, engine
│   │   └── src/
│   │       ├── adapter/           # OpenAPI3Adapter, Swagger2Adapter
│   │       ├── ir/                # IR types & utilities
│   │       └── engine/            # IR → ComponentDescriptor mapping
│   │
│   ├── react/                     # Opinionated React UI layer
│   │   └── src/
│   │       ├── components/
│   │       │   ├── fields/        # TextField, SelectField, DatePicker, etc.
│   │       │   ├── views/         # ListView, DetailView, FormView,
│   │       │   │                  # SearchView, DashboardView, WizardView
│   │       │   └── layout/        # Shell, Sidebar, TopBar
│   │       ├── registry/          # Component registry
│   │       ├── renderer/          # Dynamic renderer
│   │       ├── hooks/             # useResource, useApiCall, useForm (TanStack Query)
│   │       ├── theme/             # Design tokens, CSS variables
│   │       └── App.tsx            # Root app wired to IR config
│   │
│   └── cli/                       # CLI entry point
│       └── src/
│           ├── commands/          # serve, generate, validate
│           ├── server.ts          # Vite server + proxy setup
│           └── index.ts           # Commander.js entry
│
├── examples/
│   └── petstore.yaml              # Demo spec
├── package.json                   # pnpm workspace root
└── tsconfig.base.json
```

### Tooling

| Tool | Purpose |
|---|---|
| **pnpm workspaces** | Monorepo |
| **Vite** | Dev server + proxy (monorepo/dev mode); build tool for the React SPA |
| **React 19 + TypeScript** | UI rendering |
| **shadcn/ui + Radix** | Component library |
| **Tailwind CSS v4** | Styling (internal to SPA) |
| **React Hook Form + Zod** | Form state & validation |
| **TanStack Query** | Data fetching, caching, mutations |
| **TanStack Table** | Data tables |
| **Commander.js** | CLI framework |
| **js-yaml** | YAML parsing |
| **Vitest** | Testing |

---

## Opinionated Design System (shadcn/ui)

No configuration required — ships with a polished, modern dark/light theme built on **shadcn/ui**.

- **Component library**: shadcn/ui — accessible Radix primitives, pre-styled with Tailwind
- **Styling engine**: Tailwind CSS v4 (internal to the SPA — end-user never touches it)
- **Color palette**: shadcn/ui theme tokens (HSL-based: primary, secondary, accent, destructive, muted)
- **Typography**: Inter via Google Fonts (system font stack fallback)
- **Data tables**: shadcn `<DataTable>` with sorting, pagination, row actions
- **Forms**: shadcn `<Form>` + React Hook Form + Zod validation
- **Layout**: Collapsible sidebar, breadcrumbs, responsive shell
- **Dark/Light mode**: Built-in toggle, persisted

Overridable via a future `uigen.config.json`.

---

## Resilience & Error Handling

Real-world specs are messy. The system must degrade gracefully:

- **Missing schemas** → render generic key-value table with a warning banner
- **Malformed operations** → skip with console warning, show in dashboard as "⚠ Could not generate"
- **Spec hot-reloading** → watch the spec file on disk, re-parse and push updated IR to the SPA via WebSocket
- **Network errors** → TanStack Query retry + toast notifications with error details

---

## Phased Roadmap

### Phase 1 — Core vertical slice ✅ Complete
- [x] Monorepo scaffold (pnpm + Vite + TS)
- [x] IR types (auth, relationships, pagination hints, validation rules)
- [x] OpenAPI 3.x adapter with full `$ref` resolution
- [x] Swagger 2.0 adapter
- [x] View hint classifier (list, detail, create, update, delete, search, wizard, action)
- [x] Relationship detector (hasMany / belongsTo)
- [x] Pagination detector (offset, cursor, page-based)
- [x] Core field components (TextField, NumberField, SelectField, DatePicker, FileUpload, ArrayField, ObjectField)
- [x] ListView with TanStack Table — sorting, pagination, filtering, row actions
- [x] FormView with React Hook Form + Zod validation
- [x] CLI `serve` command with Vite proxy
- [x] Opinionated theme (shadcn/ui dark/light toggle)
- [x] Authentication UI (Bearer token + API Key)
- [x] Environment switching (server dropdown from spec `servers`)
- [x] Error resilience (graceful degradation, error boundary, toast notifications)

### Phase 2 — Full surface area ✅ Complete
- [x] DetailView with related resource links
- [x] EditFormView (pre-populated from current record)
- [x] Delete with confirmation dialog
- [x] Custom action buttons (non-CRUD operations)
- [x] SearchView (global + per-resource filters)
- [x] DashboardView (auto-generated overview with record counts)
- [x] WizardView (multi-step for large forms)
- [x] Sidebar layout + TopBar + Breadcrumbs + responsive shell
- [x] React Router with full URL navigation and browser history

### Phase 3 — Extension & distribution 🔜 In progress
- [ ] `x-uigen-*` vendor extension support (widget, label, hidden, order, view)
- [ ] `uigen.config.json` — theme/behaviour/resource overrides
- [ ] `uigen validate` — spec linting with actionable errors and line numbers
- [ ] `uigen generate` — static production build output
- [ ] OAuth2 PKCE authentication flow
- [ ] Spec hot-reloading (file watcher → WebSocket push to UI)
- [ ] Loading skeletons with shimmer animation
- [ ] Virtual scrolling for large datasets (TanStack Virtual)
- [ ] Request / response interceptors (config-driven middleware)
- [ ] Response transformation (JSONPath + JS functions)
- [ ] Publish all packages to npm (`@uigen-dev/core`, `@uigen-dev/react`, `@uigen-dev/cli`)

### Phase 4 — Renderer ecosystem
- [ ] **`@uigen-dev/svelte`** — Svelte renderer consuming the same IR. Native Svelte components, same adapters, same CLI
- [ ] **`@uigen-dev/vue`** — Vue 3 renderer. Drop-in alternative to `@uigen-dev/react`
- [ ] **Plugin API** — register custom adapters, field types, and view strategies as npm packages
- [ ] **`uigen ui:config`** — visual configuration dashboard served alongside the generated frontend. Point-and-click theme editing, field label overrides, resource reordering — no YAML required
- [ ] `@uigen-dev/plugin-charts` — chart widgets from numeric data
- [ ] `@uigen-dev/plugin-mapbox` — map renderer for geo coordinate fields
- [ ] GraphQL adapter
- [ ] OpenAPI 3.1 support

---

## Verification Plan

### Automated Tests
- Adapter parsing correctness and `$ref` round-trips (Vitest)
- IR structure completeness and field type coverage
- Property-based tests — 24 universal correctness properties via fast-check
- Commands: `pnpm --filter @uigen-dev/core test`, `pnpm --filter @uigen-dev/react test`

### Manual Verification
- `npx uigen serve --spec examples/petstore.yaml`
- Confirm: sidebar shows resources, table loads data, forms render and submit, auth token is injected, proxy hits the real API
