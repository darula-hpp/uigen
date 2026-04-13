# UIGen

> Point it at an OpenAPI spec. Get a fully functional frontend. Zero boilerplate.

![UIGen Demo](https://github.com/darula-hpp/uigen/raw/main/examples/output.gif)

```bash
npx @uigen-dev/cli serve ./openapi.yaml
# → Your UI is live at http://localhost:4400
```

No code. No config. No boilerplate. Just a spec.

---

## What you get

From a single OpenAPI file, UIGen generates a complete, production-quality frontend:

- **Sidebar navigation** — auto-built from your API resources
- **Fully interactive** — all API calls are live, hitting your real endpoints via a built-in proxy
- **Table views** — data from your GET endpoints, with sorting, pagination, and filtering
- **Create & edit forms** — fields, types, and validation derived from your schema
- **Detail views** — read-only record display with related resource links
- **Delete with confirmation** — one-click delete with a safety dialog
- **Authentication** — Bearer token, API Key, HTTP Basic, and credential-based login flows — persisted across sessions
- **Multi-step wizards** — auto-split for large forms (8+ fields)
- **Custom action buttons** — non-CRUD endpoints like `POST /users/{id}/activate`
- **Search views** — per-resource filtered search from query params in your spec
- **Dashboard** — overview of all resources with record counts
- **Environment switching** — dropdown from your spec's `servers` list
- **Dark / light theme** — built-in toggle, persisted to local storage


---

## Quick Start

```bash
# Run directly with npx — no install required
npx @uigen-dev/cli serve ./openapi.yaml

# Or with a remote spec URL
npx @uigen-dev/cli serve https://petstore3.swagger.io/api/v3/openapi.json

# Custom port
npx @uigen-dev/cli serve ./openapi.yaml --port 8080

# Override the target server
npx @uigen-dev/cli serve ./openapi.yaml --proxy-base https://api.yourapp.com

# Choose a renderer (default: react)
npx @uigen-dev/cli serve ./openapi.yaml --renderer react
```

Visit `http://localhost:4400` to see your generated UI.

---

## Live Demo

```bash
git clone https://github.com/darula-hpp/uigen
cd uigen
pnpm install && pnpm build
node packages/cli/dist/index.js serve examples/twilio_messaging_v1.yaml
```

---

## How it works

UIGen parses your OpenAPI spec and converts it into an **Intermediate Representation (IR)** — a structured description of your resources, operations, schemas, authentication, and relationships. A pre-built React SPA reads that IR and renders the appropriate views. A Vite dev server serves the SPA and proxies your API calls to your real backend.

Because the IR is framework-agnostic, the React layer is just the default. The same IR drives `@uigen-dev/svelte` and `@uigen-dev/vue` — same spec, different renderer, your choice of stack.

```
OpenAPI Spec (YAML/JSON)
        │
        ▼
    Adapter (parser)
        │
        ▼
    IR (typed config)
        │
        ▼
    React SPA (renderer)
        │
        ▼  live API calls via proxy
    Your API
```

The IR is the contract. Everything built on top of UIGen talks to the IR — not to the spec format or the UI framework.

---

## Supported Specs

| Format | Status |
|---|---|
| OpenAPI 3.x (YAML/JSON) | ✅ Supported |
| Swagger 2.0 | ✅ Supported |
| OpenAPI 3.1 | 🔜 Planned |

---

## What's implemented today

### Core engine
- [x] OpenAPI 3.x adapter — full schema resolution, `$ref` handling, circular reference detection
- [x] Swagger 2.0 adapter
- [x] IR types — resources, operations, auth, relationships, pagination hints, validation rules
- [x] View hint classifier — detects list, detail, create, update, delete, search, wizard, action
- [x] Relationship detector — `hasMany` from nested paths, `belongsTo` from URI fields
- [x] Pagination detector — offset, cursor, and page-based strategies
- [x] Graceful degradation — malformed operations are skipped, not crashed

### Views
- [x] **ListView** — TanStack Table, sorting, pagination, row actions, empty state, filter row
- [x] **DetailView** — read-only fields, related resource links, edit/delete/custom action buttons
- [x] **FormView** — React Hook Form + Zod validation, all field types, inline errors, loading state
- [x] **EditFormView** — pre-populated from current record data, PUT/PATCH on submit
- [x] **SearchView** — filter inputs per query param, result count, clear filters
- [x] **DashboardView** — resource cards with record counts and navigation links
- [x] **WizardView** — multi-step form for large schemas, step validation, back navigation
- [x] **LoginView** — auth credential input before accessing protected resources

### Field components
- [x] TextField (with `textarea` variant)
- [x] NumberField (with min/max enforcement)
- [x] CheckboxField
- [x] SelectField (enum values, `x-enumNames` support)
- [x] DatePicker / DateTimePicker
- [x] FileUpload (drag-and-drop, progress display)
- [x] ArrayField (add/remove items, length validation)
- [x] ObjectField (nested fieldsets, collapsible)

### Auth & infrastructure
- [x] Bearer token authentication — input, session storage, `Authorization` header injection, logout
- [x] API Key authentication — header and query param injection
- [x] HTTP Basic authentication — username/password, base64 encoded
- [x] Credential-based login — detects login endpoints from spec, posts credentials, extracts token
- [x] Server selector — environment dropdown from spec `servers`
- [x] Delete confirmation dialog
- [x] Custom action buttons (non-CRUD endpoints)
- [x] Toast notifications (success / error / warning / info, auto-dismiss)
- [x] Error boundary — component errors contained, app stays running
- [x] Dark / light theme toggle with system preference detection

### CLI
- [x] `uigen serve` — starts dev server with IR injected
- [x] YAML / JSON auto-detection
- [x] Vite proxy to real API server
- [x] CORS handling
- [x] Verbose logging flag

---

## Project Structure

```
uigen/
├── packages/
│   ├── core/          # Framework-agnostic: adapters, IR types, engine
│   ├── react/         # Opinionated React UI layer
│   └── cli/           # CLI entry point (Commander.js)
├── examples/
│   ├── twilio_messaging_v1.yaml  # Twilio Messaging API spec
│   └── stripe.yaml               # Stripe API spec
└── pnpm-workspace.yaml
```

Each package is independently publishable:

| Package | npm | Purpose |
|---|---|---|
| `@uigen-dev/core` | ✅ published | IR types, adapters, engine — framework agnostic. Build your own renderer on top |
| `@uigen-dev/react` | ✅ published | The default React renderer. Extend or swap components via the registry |
| `@uigen-dev/cli` | ✅ published | The `npx uigen` entry point |
| `@uigen-dev/svelte` | planned | Svelte renderer — same IR, native Svelte components |
| `@uigen-dev/vue` | planned | Vue 3 renderer — same IR, native Vue components |

---

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

---

## Extending UIGen

### Custom field components

Register your own component for any field type — without touching the rest of the tool:

```tsx
import { registry } from '@uigen-dev/react';
import { MyMapField } from './fields/MapField';

registry.register('geo', MyMapField);
```

### Spec annotations (`x-uigen-*`)

> Coming in the next release

Annotate your OpenAPI spec directly to control how fields are rendered:

```yaml
properties:
  description:
    type: string
    x-uigen-widget: textarea
    x-uigen-label: "Product Description"
  internal_code:
    type: string
    x-uigen-hidden: true
  status:
    type: string
    x-uigen-order: 1
```

### Configuration file

> Coming soon

```json
// uigen.config.json
{
  "theme": {
    "primary": "hsl(220, 90%, 56%)",
    "font": "Geist"
  },
  "resources": {
    "users": { "label": "Team Members", "defaultPageSize": 50 }
  }
}
```

---

## Roadmap

### 🔜 Next up
- [ ] `x-uigen-*` vendor extension support — annotate your spec to customize rendering
- [ ] `uigen.config.json` — theme, labels, page sizes, field overrides
- [ ] `uigen validate` — lint your spec, report what can and can't be generated with actionable errors
- [ ] `uigen generate` — output a static production build to a directory
- [ ] OAuth2 PKCE flow — full login for OAuth2-secured APIs
- [ ] Spec hot-reload — file watcher pushes updated IR to UI via WebSocket, no restart needed
- [ ] Loading skeletons — shimmer placeholders matching actual content layout
- [ ] Virtual scrolling — TanStack Virtual for tables with 1000+ rows

### 🧩 Ecosystem
- [ ] **`@uigen-dev/svelte`** — Svelte renderer consuming the same IR. Same adapters, different UI layer
- [ ] **`@uigen-dev/vue`** — Vue 3 renderer. Drop-in alternative to `@uigen-dev/react`
- [ ] **Plugin API** — register custom adapters, field types, and view strategies as npm packages
- [ ] **`uigen ui:config`** — a visual configuration dashboard served alongside your generated UI. Point-and-click theme editing, field label overrides, resource reordering — no YAML editing required

### 🔭 Further out
- [ ] OpenAPI 3.1 support
- [ ] GraphQL adapter
- [ ] gRPC / Protobuf adapter
- [ ] Response transformation — JSONPath selectors to reshape API responses before rendering
- [ ] Request / response interceptors — middleware for custom auth logic or tenant injection
- [ ] `@uigen-dev/plugin-charts` — auto-generate chart widgets from numeric data
- [ ] `@uigen-dev/plugin-mapbox` — map field renderer for geo coordinates

---

## Known limitations

- Schema `$ref` resolution works for most cases; deeply nested circular refs may degrade gracefully
- Edit view pre-population requires a `GET /resource/{id}` endpoint in your spec
- Authentication UI covers Bearer, API Key, HTTP Basic, and credential-based login — OAuth2 PKCE is in progress
- Sub-resources (e.g. `/services/{id}/members`) appear in the sidebar only when viewing a parent detail page
- Error messages are informative but not yet fully localised

---

## Contributing

Issues and PRs are welcome. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design documentation.

> **Building a renderer for another framework?** The `@uigen-dev/core` package is the only dependency you need. The IR contract is stable.

---

## License

MIT
