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
┌──────────────┐     ┌──────────────┐     ┌──────────┐     ┌──────┐     ┌────────┐     ┌──────────────┐
│ API Document │────▸│ Reconciler   │────▸│ Adapter  │────▸│  IR  │────▸│ Engine │────▸│   React SPA  │
│ (YAML/JSON)  │     │ (Config      │     │ (Parser) │     │      │     │        │     │ (served)     │
│              │     │  Merge)      │     │          │     │      │     │        │     │              │
└──────────────┘     └──────────────┘     └──────────┘     └──────┘     └────────┘     └──────────────┘
       │                    ▲                                                                   │
       │                    │                                                         ┌─────────┘
       │             ┌──────────────┐                                                 ▼
       │             │ Config File  │                                           ┌───────────┐
       │             │ (.uigen/     │                                           │ API Proxy │──▸ Real API
       │             │  config.yaml)│                                           └───────────┘
       │             └──────────────┘
       │
       └──▸ (Source spec unchanged on disk)
```

The CLI:
1. Reads & parses the spec file
2. Loads `.uigen/config.yaml` (if present) and reconciles annotations into the spec
3. Adapts the reconciled spec to the IR
4. Injects the IR as `window.__UIGEN_CONFIG__` into the React SPA's `index.html`
5. **Dev mode** (monorepo): starts a Vite dev server that serves the SPA and proxies `/api/*` to the real backend
6. **Static mode** (npm/npx install): serves the pre-built `dist/` with a plain Node.js HTTP server and a built-in proxy — no Vite required at runtime

---

## Design Patterns

| Pattern | Where | Why |
|---|---|---|
| **Adapter** | Document ingestion | Normalizes OpenAPI 3.x / Swagger 2.0 into IR |
| **Visitor** | Schema processing | Separates schema traversal algorithms from schema structures (TypeMappingVisitor, ValidationExtractionVisitor, FileMetadataVisitor, ReferenceResolutionVisitor) |
| **Factory** | Schema node creation | Encapsulates creation logic for different schema node types (SchemaNodeFactory) |
| **Strategy** | Authentication detection, View rendering | Swaps between different detection/rendering strategies (LoginDetectionStrategy, SignUpDetectionStrategy, PasswordResetDetectionStrategy, RefreshTokenDetectionStrategy) |
| **Facade** | OpenAPI3Adapter | Provides simplified interface to complex subsystem of processors and detectors |
| **Registry** | Component lookup, Annotations | Central `type → Component` map, annotation handler registry |
| **Proxy** | API calls | CLI proxies requests to avoid CORS issues |
| **Reconciler** | Config merging | Merges user config annotations into spec at runtime |


**Integration**:
```typescript
// OpenAPI3Adapter acts as a facade that orchestrates components
class OpenAPI3Adapter {
  private schemaProcessor: SchemaProcessor;
  private authDetector: AuthDetector;
  private resourceExtractor: ResourceExtractor;
  private parameterProcessor: ParameterProcessor;
  private bodyProcessor: BodyProcessor;
  private operationProcessor: OperationProcessor;

  constructor(spec: OpenAPI3Document, utils: AdapterUtils) {
    // Initialize all components
    this.schemaProcessor = new SchemaProcessor(spec, utils, annotationRegistry);
    this.authDetector = new AuthDetector(spec, utils);
    this.parameterProcessor = new ParameterProcessor(spec, utils, this.schemaProcessor);
    this.bodyProcessor = new BodyProcessor(spec, utils, this.schemaProcessor, annotationRegistry);
    this.operationProcessor = new OperationProcessor(
      viewHintClassifier,
      this.parameterProcessor,
      this.bodyProcessor,
      annotationRegistry
    );
    this.resourceExtractor = new ResourceExtractor(
      spec,
      utils,
      this.schemaProcessor,
      this.operationProcessor,
      relationshipDetector,
      paginationDetector
    );
  }

  adapt(): UIGenApp {
    // Delegate to components and aggregate results
    return {
      meta: this.extractMeta(),
      resources: this.resourceExtractor.extractResources(),
      auth: this.authDetector.detectAuthConfig(),
      dashboard: this.buildDashboard(),
      servers: this.extractServers(),
    };
  }
}
```

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

## Override System

The Override System enables selective view customization while keeping the rest of the UI auto-generated. It provides escape hatches at three levels of control, allowing developers to opt into customization only where needed.

### Core Principle

Overrides are **opt-in**, **composable**, and **type-safe**:
- Default views work unchanged without any overrides
- Each view can be independently customized
- Overrides are discovered automatically by the CLI
- Full TypeScript support with typed props

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Override Discovery                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  CLI Discovery (File-Based)                        │   │
│  │  - Scans src/overrides/*.tsx                       │   │
│  │  - Transpiles with esbuild                         │   │
│  │  - Injects via window.__UIGEN_OVERRIDES__         │   │
│  └────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Programmatic Registration                         │   │
│  │  - Direct API: overrideRegistry.register()        │   │
│  │  - Runtime registration in application code       │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │  Override Registry    │
                  │  - Stores definitions │
                  │  - Resolves by ID     │
                  │  - Mode reconciliation│
                  └───────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │  View Reconciliation  │
                  │  - Checks annotations │
                  │  - Applies overrides  │
                  │  - Renders view       │
                  └───────────────────────┘
```

### Override Modes

**Component Mode** — Full ownership (data fetching + rendering):
```typescript
// src/overrides/custom-profile.tsx
import type { OverrideDefinition, OverrideComponentProps } from '@uigen-dev/react';

function CustomProfile({ resource }: OverrideComponentProps) {
  const [data, setData] = useState(null);
  // Custom data fetching, state management, everything
  return <div>My Custom Profile</div>;
}

const override: OverrideDefinition = {
  targetId: 'me',
  component: CustomProfile,
};

export default override;
```

**Render Mode** — UIGen fetches data, you control rendering:
```typescript
// src/overrides/users-list.tsx
import type { OverrideDefinition, ListRenderProps } from '@uigen-dev/react';

const override: OverrideDefinition = {
  targetId: 'users.list',
  render: ({ data, isLoading, pagination }: ListRenderProps) => {
    if (isLoading) return <div>Loading...</div>;
    return (
      <div className="custom-grid">
        {data?.map(user => <UserCard key={user.id} user={user} />)}
      </div>
    );
  },
};

export default override;
```

**UseHooks Mode** — Side effects only (analytics, tracking):
```typescript
// src/overrides/analytics.tsx
import { useEffect } from 'react';
import type { OverrideDefinition, OverrideHookProps } from '@uigen-dev/react';

const override: OverrideDefinition = {
  targetId: 'users.list',
  useHooks: ({ resource }: OverrideHookProps) => {
    useEffect(() => {
      analytics.track('page_view', { resource: resource.name });
    }, [resource]);
  },
};

export default override;
```

### Configuration

Add `x-uigen-override` annotation to `.uigen/config.yaml`:

```yaml
version: "1.0"
annotations:
  GET:/api/v1/auth/me:
    x-uigen-override:
      id: me              # Stable identifier (required)
      enabled: true       # Optional, defaults to true
  GET:/api/v1/users:
    x-uigen-override:
      id: users.list
```

### File-Based Workflow

1. **Annotate**: Add `x-uigen-override` to config with stable `id`
2. **Create**: Add override file to `src/overrides/` with matching `targetId`
3. **Serve**: CLI discovers, transpiles, and injects automatically
4. **Hot Reload**: Changes to override files trigger browser reload

### Addressing Scheme

Every view has a stable `uigenId` for targeting:

| View | uigenId Pattern | Example |
|------|----------------|---------|
| List | `{resource}.list` | `users.list` |
| Detail | `{resource}.detail` | `users.detail` |
| Create | `{resource}.create` | `users.create` |
| Edit | `{resource}.edit` | `users.edit` |
| Search | `{resource}.search` | `users.search` |
| Profile | `me` | `me` |
| Dashboard | `dashboard` | `dashboard` |

The `resource` comes from `x-uigen-id` annotation or falls back to the resource slug.

### Priority Rules

When multiple modes are defined, priority is:
```
component > render > useHooks
```

Only the highest-priority mode is used.

### Error Handling

The override system never crashes the application:
- **Component errors** → caught by ErrorBoundary, shows fallback UI
- **Render function errors** → caught with try/catch, falls back to built-in view
- **useHooks errors** → caught with try/catch, built-in view renders normally

All errors are logged to console with `targetId` for debugging.

### Testing Strategy

Overrides are validated through:
- **Type checking**: Full TypeScript support with typed props
- **Runtime validation**: Checks for required fields (targetId, at least one mode)
- **Error boundaries**: Graceful degradation on component failures
- **Unit tests**: Test override components independently

---

## Environment Variable Resolution

UIGen supports environment variable resolution in `.uigen/config.yaml` using `${VAR_NAME}` syntax. This enables secure credential management without hardcoding sensitive values.

### Syntax

```yaml
version: "1.0"
annotations:
  GET:/api/v1/auth/oauth/google:
    x-uigen-oauth:
      provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      redirectUri: ${GOOGLE_REDIRECT_URI}
      scopes:
        - openid
        - profile
        - email
```

### Resolution Process

1. **Load .env**: CLI loads `.env` file from spec directory
2. **Parse config**: Reads `.uigen/config.yaml`
3. **Resolve variables**: Replaces `${VAR_NAME}` with environment values
4. **Validate**: Ensures all required variables are defined
5. **Reconcile**: Merges resolved config into spec

### .env File Location

UIGen looks for `.env` in the same directory as the OpenAPI spec:

```
your-project/
├── openapi.yaml
├── .env                    # Environment variables
└── .uigen/
    └── config.yaml         # References ${VAR_NAME}
```

### Error Handling

- **Missing variable**: Logs error with variable name, exits with non-zero status
- **Malformed syntax**: Logs error with line number, exits
- **Missing .env**: Gracefully degrades (variables remain as `${VAR_NAME}`)

### Security

- `.env` files should be gitignored
- Never commit credentials to version control
- Use different `.env` files for dev/staging/production
- Environment variables are resolved at CLI startup, not stored in IR

---

## Config Reconciliation System

The Config Reconciliation System enables runtime merging of user-defined annotation overrides from `.uigen/config.yaml` into OpenAPI/Swagger specifications without modifying source files. This bridges the config-gui's annotation preferences with the serve command's spec processing pipeline.

### Core Principle

Reconciliation is **non-destructive**, **idempotent**, and **deterministic**:
- Source spec file remains unchanged on disk
- In-memory reconciled spec reflects all config annotations
- Config annotations take precedence over spec annotations
- Applying reconciliation twice produces the same result as applying it once

### Architecture

```
┌─────────────────┐
│  Serve Command  │
└────────┬────────┘
         │
         ├──▶ Config Loader ──▶ Reads .uigen/config.yaml
         │
         ├──▶ Spec Loader ──▶ Reads OpenAPI/Swagger YAML
         │
         ▼
    ┌─────────────────────────────────────────┐
    │         Reconciler (Core)               │
    │                                         │
    │  ┌────────────────────────────────┐   │
    │  │  Element Path Resolver         │   │
    │  │  - Parses element paths        │   │
    │  │  - Locates spec elements       │   │
    │  │  - Caches resolved paths       │   │
    │  └────────────────────────────────┘   │
    │                                         │
    │  ┌────────────────────────────────┐   │
    │  │  Annotation Merger             │   │
    │  │  - Deep clones source spec     │   │
    │  │  - Applies config annotations  │   │
    │  │  - Handles null (removal)      │   │
    │  │  - Deterministic ordering      │   │
    │  └────────────────────────────────┘   │
    │                                         │
    │  ┌────────────────────────────────┐   │
    │  │  Validator                     │   │
    │  │  - Validates reconciled spec   │   │
    │  │  - Checks $ref integrity       │   │
    │  │  - Verifies required fields    │   │
    │  └────────────────────────────────┘   │
    └─────────────────┬───────────────────────┘
                      │
                      ▼
              ┌──────────────────┐
              │ Reconciled Spec  │──▸ In-memory only
              │ (OpenAPI 3.x or  │    Used for IR generation
              │  Swagger 2.0)    │    API proxy, view rendering
              └──────────────────┘
```

### Element Path Syntax

The reconciler uses element paths to identify where annotations should be applied:

**Operations**: `METHOD:/path/to/endpoint`
- Examples: `POST:/api/v1/users`, `GET:/users/{id}`, `DELETE:/items/{itemId}`
- Supports all HTTP methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD

**Schema Properties**: `SchemaName.propertyName`
- Examples: `User.email`, `Product.price`, `Address.street`
- Nested properties: `User.address.street`, `Order.items.quantity`
- Resolves $ref references automatically

### Generic Annotation Handling

The reconciler treats **ALL** `x-uigen-*` annotations generically without hardcoding specific annotation names. This means:
- New annotations work automatically without code changes
- No switch statements on annotation names
- Open-closed principle: open for extension, closed for modification

### Config File Structure

```yaml
version: "1.0"
enabled:
  x-uigen-ignore: true
  x-uigen-login: true
defaults:
  x-uigen-ignore:
    value: false
annotations:
  POST:/api/v1/users:
    x-uigen-ignore: true
  User.email:
    x-uigen-label: "Email Address"
  POST:/auth/login:
    x-uigen-login: true
```

### Reconciliation Workflow

1. **Load Config**: Check for `.uigen/config.yaml`, parse YAML into ConfigFile object
2. **Deep Clone**: Create in-memory copy of source spec (never modify original)
3. **Resolve Paths**: For each element path in config, locate corresponding spec element
4. **Merge Annotations**: Apply config annotations to resolved elements (config takes precedence)
5. **Validate**: Ensure reconciled spec is valid OpenAPI/Swagger
6. **Return**: Reconciled spec with metadata (applied count, warnings)

### Error Handling

- **Missing config**: Gracefully degrade to source spec
- **Invalid element path**: Log warning with suggestions, skip annotation, continue
- **Validation failure**: Log error with path, exit (don't serve invalid spec)
- **Malformed config**: Log error, exit with non-zero status

### Testing Strategy

The reconciler is validated through:
- **Unit tests**: Specific scenarios and edge cases
- **Property-based tests**: 20 universal correctness properties, 100+ iterations each
- **Integration tests**: End-to-end with real OpenAPI/Swagger specs

Key properties verified:
- Config precedence over spec annotations
- Idempotence (applying twice = applying once)
- Determinism (same input → same output)
- Source spec non-mutation
- Output validity preservation

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
│   │       │   ├── openapi3.ts                  # Main adapter facade (~250-300 lines)
│   │       │   ├── swagger2.ts                  # Swagger 2.0 adapter
│   │       │   ├── schema-processor.ts          # Schema processing orchestrator
│   │       │   ├── auth-detector.ts             # Authentication endpoint detection
│   │       │   ├── resource-extractor.ts        # Resource inference and extraction
│   │       │   ├── parameter-processor.ts       # Parameter processing and merging
│   │       │   ├── body-processor.ts            # Request/response body processing
│   │       │   ├── operation-processor.ts       # Operation-level processing coordinator
│   │       │   ├── view-hint-classifier.ts      # View type classification
│   │       │   ├── schema-resolver.ts           # $ref resolution
│   │       │   ├── file-type-detector.ts        # File type detection
│   │       │   ├── visitors/                    # Visitor pattern implementations
│   │       │   │   ├── type-mapping-visitor.ts
│   │       │   │   ├── validation-extraction-visitor.ts
│   │       │   │   ├── file-metadata-visitor.ts
│   │       │   │   └── reference-resolution-visitor.ts
│   │       │   ├── factories/                   # Factory pattern implementations
│   │       │   │   └── schema-node-factory.ts
│   │       │   └── annotations/                 # Annotation handling
│   │       │       ├── registry.ts
│   │       │       └── handlers/                # Annotation-specific handlers
│   │       │           ├── auth-handler.ts
│   │       │           ├── override-handler.ts
│   │       │           └── ...
│   │       ├── ir/                # IR types & utilities
│   │       ├── engine/            # IR → ComponentDescriptor mapping
│   │       ├── reconciler/        # Config reconciliation system
│   │       │   ├── reconciler.ts              # Main reconciler
│   │       │   ├── path-resolver.ts           # Element path resolution
│   │       │   ├── auth-reconciler.ts         # Auth-specific reconciliation
│   │       │   └── ...
│   │       └── config/            # Config loading and env var resolution
│   │           ├── loader.ts
│   │           └── env-var-resolver.ts
│   │
│   ├── react/                     # Opinionated React UI layer
│   │   └── src/
│   │       ├── components/
│   │       │   ├── fields/        # TextField, SelectField, DatePicker, etc.
│   │       │   ├── views/         # ListView, DetailView, FormView,
│   │       │   │                  # SearchView, DashboardView, WizardView, ProfileView
│   │       │   └── layout/        # Shell, Sidebar, TopBar
│   │       ├── overrides/         # Override system
│   │       │   ├── registry.ts                # Override registry
│   │       │   ├── registration.ts            # Injected override registration
│   │       │   ├── reconcile.ts               # Override reconciliation
│   │       │   ├── types.ts                   # TypeScript types
│   │       │   └── OverrideHooksHost.tsx      # useHooks mode host component
│   │       ├── registry/          # Component registry
│   │       ├── renderer/          # Dynamic renderer
│   │       ├── hooks/             # useResource, useApiCall, useForm (TanStack Query)
│   │       ├── theme/             # Design tokens, CSS variables
│   │       └── App.tsx            # Root app wired to IR config
│   │
│   ├── cli/                       # CLI entry point
│   │   └── src/
│   │       ├── commands/          # serve, build, init, config
│   │       ├── overrides/         # Override discovery and transpilation
│   │       │   ├── discovery.ts               # File discovery
│   │       │   ├── transpiler.ts              # esbuild transpilation
│   │       │   ├── injector.ts                # window.__UIGEN_OVERRIDES__ injection
│   │       │   └── validator.ts               # Override validation
│   │       ├── server.ts          # Vite server + proxy setup
│   │       ├── utils/             # Scaffolding, file operations
│   │       └── index.ts           # Commander.js entry
│   │
│   └── config-gui/                # Visual configuration editor
│       └── src/
│           ├── components/        # AnnotationForm, FieldEditor, etc.
│           ├── hooks/             # useConfig, useAnnotations
│           └── App.tsx            # Config GUI root
│
├── examples/
│   └── apps/
│       └── fastapi/
│           └── meeting-minutes/   # Full example app
│               ├── openapi.yaml
│               ├── .uigen/
│               │   ├── config.yaml
│               │   └── theme.css
│               └── src/
│                   └── overrides/  # Example overrides
│                       └── profile-complete.tsx
├── SKILLS/                        # AI agent skills
│   ├── auto-annotate.md
│   ├── configure-oauth.md
│   ├── create-overrides.md
│   └── applying-styles-to-react-spa.md
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

## Config GUI

The Config GUI is a visual annotation editor served alongside the generated frontend at `/config`. It provides a point-and-click interface for configuring UIGen without editing YAML files.

### Access

```bash
npx uigen serve openapi.yaml
# Main app: http://localhost:4400
# Config GUI: http://localhost:4400/config
```

### Features

- **Visual annotation editor**: Add/edit/remove `x-uigen-*` annotations
- **Operation browser**: Navigate spec operations with search and filtering
- **Schema inspector**: View and annotate schema properties
- **Live preview**: See changes reflected immediately in main app
- **Export config**: Download `.uigen/config.yaml` with all annotations
- **Annotation catalog**: Browse all available `x-uigen-*` annotations with descriptions

### Workflow

1. **Browse**: Navigate operations and schemas in the spec
2. **Annotate**: Click to add annotations (labels, auth, file uploads, etc.)
3. **Preview**: Switch to main app to see changes
4. **Export**: Download config file to `.uigen/config.yaml`
5. **Commit**: Add config to version control

### Supported Annotations

The Config GUI supports all `x-uigen-*` annotations:
- `x-uigen-label`: Custom field labels
- `x-uigen-ignore`: Hide operations/fields
- `x-uigen-login`, `x-uigen-signup`, `x-uigen-password-reset`: Auth endpoints
- `x-uigen-file-upload`: File upload configuration
- `x-uigen-chart`: Chart visualization
- `x-uigen-relationship`: Resource relationships
- `x-uigen-override`: View overrides
- `x-uigen-profile`: Profile page marker
- `x-uigen-id`: Stable resource identifiers

### Architecture

```
┌──────────────────────────────────────────────────────┐
│              Config GUI (React SPA)                   │
│                                                       │
│  ┌────────────────────────────────────────────┐    │
│  │  Operation Browser                         │    │
│  │  - Lists all operations                    │    │
│  │  - Search and filter                       │    │
│  │  - Shows existing annotations              │    │
│  └────────────────────────────────────────────┘    │
│                                                       │
│  ┌────────────────────────────────────────────┐    │
│  │  Annotation Form                           │    │
│  │  - Dynamic form based on annotation type  │    │
│  │  - Validation and type checking            │    │
│  │  - Preview and apply                       │    │
│  └────────────────────────────────────────────┘    │
│                                                       │
│  ┌────────────────────────────────────────────┐    │
│  │  Config Exporter                           │    │
│  │  - Generates .uigen/config.yaml            │    │
│  │  - Downloads to local filesystem           │    │
│  └────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### Future Enhancements

- **Theme editor**: Visual theme customization (colors, fonts, spacing)
- **Resource reordering**: Drag-and-drop sidebar organization
- **Bulk operations**: Apply annotations to multiple operations at once
- **Undo/redo**: History management for annotation changes
- **Collaboration**: Share config changes with team members

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

### Phase 3 — Extension & distribution ✅ Complete
- [x] `x-uigen-*` vendor extension support (label, hidden, ignore, profile, login, signup, password-reset, refresh-token, file-upload, chart, relationship, override, id)
- [x] `.uigen/config.yaml` — annotation-based configuration system with reconciliation
- [x] Environment variable resolution (`${VAR_NAME}` syntax in config)
- [x] OAuth 2.0 social login (Google, GitHub, Facebook, Microsoft) via `x-uigen-auth`
- [ ] OAuth2 PKCE for web SPA (public clients without client secret)
- [x] Override system — file-based and programmatic view customization (component, render, useHooks modes)
- [x] Config GUI — visual annotation editor served at `/config`
- [x] AI agent skills (auto-annotate, configure-oauth, applying-styles)
- [x] `uigen build` — static production build output
- [x] `uigen init` — project scaffolding with config files
- [x] Landing page support with hero, features, pricing, testimonials, FAQ sections
- [x] Profile view with inline editing
- [x] DateTime formatting with declarative patterns
- [x] Chart annotations (line, bar, pie, scatter)
- [x] File upload with type-aware validation and previews
- [ ] `uigen validate` — spec linting with actionable errors and line numbers
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
