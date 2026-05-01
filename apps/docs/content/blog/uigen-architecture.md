---
title: "UIGen Architecture: A Deep Dive"
author: "UIGen Team"
date: "2026-04-18"
excerpt: "A comprehensive look at UIGen's architecture, design patterns, and the benefits of each architectural decision."
tags: ["architecture", "technical", "deep-dive"]
---

## Introduction

UIGen is a CLI tool that turns any OpenAPI or Swagger specification into a fully functional, interactive frontend -- no code required, no boilerplate, no configuration (But you get way better results when you use the config command). You point it at a spec file, and within seconds you have a working UI with tables, forms, authentication, pagination, and live API calls.

But building something that works reliably across thousands of different API shapes requires more than a clever script. It requires a thoughtful architecture that can handle the full spectrum of real-world API designs: inconsistent naming conventions, nested schemas, complex authentication flows, and edge cases that no spec author anticipated.

This post is a deep technical dive into how UIGen is built. We will walk through the core data flow, the design patterns that make the system extensible, the Intermediate Representation (IR) that decouples parsing from rendering, the Config Reconciliation System that lets users customize behavior without touching their spec files, and the CLI architecture that makes everything work in both development and production environments.

Whether you are evaluating UIGen for your team, building a plugin, or just curious about how a runtime frontend generator works under the hood, this post will give you a complete picture of the system.

---

## Core Data Flow

At the highest level, UIGen transforms a static API description into a live, interactive frontend. The pipeline has six stages, each with a clear responsibility.

```
CLI Command
    |
    v
+----------------+     +----------------+     +----------+     +------+     +--------+     +--------------+
| API Document   |---->| Reconciler     |---->| Adapter  |---->|  IR  |---->| Engine |---->|  React SPA   |
| (YAML/JSON)    |     | (Config Merge) |     | (Parser) |     |      |     |        |     | (served)     |
+----------------+     +----------------+     +----------+     +------+     +--------+     +--------------+
       |                      ^                                                                    ^
       |                      |                                                                    |
       |               +----------------+                                                          |
       |               | Config File    |                                                          |
       |               | (.uigen/       |                                                          |
       |               |  config.yaml)  |                                          +-----------+   |
       |               +----------------+                                          | API Proxy |---+
       |                                                                           +-----------+   |
       |                                                                                           |
       +---> (Source spec unchanged on disk)                                                      |
                                                                                                   |
                                                                                                   |
+----------------+                                                                                 |
| Custom CSS     |     CLI reads and injects directly via window.__UIGEN_CSS__                    |
| (.uigen/       |     (no preprocessing)                                                         |
|  theme.css)    |----------------------------------------------------------------------------------+
+----------------+
```

**Stage 1: API Document Ingestion.** The CLI reads the spec file from disk. It auto-detects whether the file is OpenAPI 3.x or Swagger 2.0 based on the `openapi` or `swagger` version field. The raw YAML or JSON is parsed into a plain JavaScript object.

**Stage 2: Config Reconciliation.** Before the spec reaches the adapter, it passes through the Reconciler. If a `.uigen/config.yaml` file exists in the project, the Reconciler merges user-defined annotations into the spec in memory. The source file on disk is never modified. This is where labels, visibility overrides, and custom hints are applied.

**Stage 3: Adapter (Parsing).** The reconciled spec is passed to the appropriate adapter -- `OpenAPI3Adapter` or `Swagger2Adapter`. The adapter normalizes the spec into the Intermediate Representation (IR), resolving `$ref` references, inferring view hints, detecting pagination strategies, and mapping field types.

**Stage 4: Intermediate Representation.** The IR is a framework-agnostic data structure that describes the entire UI: resources, operations, schemas, authentication, and relationships. It is the contract between the parsing layer and the rendering layer.

**Stage 5: Engine.** The Engine maps IR nodes to component descriptors. It decides which React component to render for each field type, which view layout to use for each operation, and how to wire up data fetching.

**Stage 6: React SPA.** The IR is injected into the React SPA as `window.__UIGEN_CONFIG__`. The SPA reads this config at startup and renders the full UI. In dev mode, a Vite dev server handles hot reloading. In static mode, a pre-built `dist/` is served by a plain Node.js HTTP server.

**Parallel Path: Custom Styling.** Alongside the IR flow, the CLI also reads `.uigen/theme.css` (if it exists) and injects it into the React SPA via `window.__UIGEN_CSS__`. The SPA applies this CSS at runtime, extending the base Tailwind styles. This parallel path allows visual customization without rebuilding the application.

The key insight is that each stage has a single responsibility and communicates through well-defined interfaces. This makes the system testable, extensible, and easy to reason about.

---

## Design Patterns

UIGen uses eight design patterns, each chosen to solve a specific problem in the architecture.

### Adapter Pattern

**Problem:** OpenAPI 3.x and Swagger 2.0 have different structures, different field names, and different ways of expressing the same concepts. The rest of the system should not need to know which format it is dealing with.

**Solution:** Each spec format has its own adapter that implements a common interface. The adapter normalizes the spec into the IR.

```typescript
interface SpecAdapter {
  parse(spec: unknown): UIGenApp;
}

class OpenAPI3Adapter implements SpecAdapter {
  parse(spec: OpenAPI3Document): UIGenApp {
    // Normalize OpenAPI 3.x into IR
    return {
      meta: this.extractMeta(spec),
      resources: this.resourceExtractor.extractResources(),
      auth: this.authDetector.detectAuthConfig(),
      dashboard: this.buildDashboard(spec),
      servers: this.extractServers(spec),
    };
  }
}

class Swagger2Adapter implements SpecAdapter {
  parse(spec: Swagger2Document): UIGenApp {
    // Normalize Swagger 2.0 into IR
    // Different field names, same output shape
  }
}
```

The adapter registry selects the right adapter based on the spec version, so the rest of the pipeline never needs a conditional.

### Visitor Pattern

**Problem:** Schema processing involves multiple independent operations (type mapping, validation extraction, file metadata extraction, reference resolution) that should not be tightly coupled to the schema structure.

**Solution:** The Visitor pattern separates algorithms from the objects they operate on. Each visitor implements a specific schema processing operation.

```typescript
interface SchemaVisitor {
  visit(schema: OpenAPISchema, context: VisitorContext): any;
}

class TypeMappingVisitor implements SchemaVisitor {
  visit(schema: OpenAPISchema): FieldType {
    if (schema.type === 'string' && schema.format === 'date') return 'date';
    if (schema.type === 'string' && schema.format === 'binary') return 'file';
    if (schema.enum) return 'enum';
    return schema.type as FieldType;
  }
}

class ValidationExtractionVisitor implements SchemaVisitor {
  visit(schema: OpenAPISchema): ValidationRule[] {
    const rules: ValidationRule[] = [];
    if (schema.minLength) rules.push({ type: 'minLength', value: schema.minLength });
    if (schema.pattern) rules.push({ type: 'pattern', value: schema.pattern });
    if (schema.minimum) rules.push({ type: 'minimum', value: schema.minimum });
    return rules;
  }
}

// SchemaProcessor orchestrates visitors
class SchemaProcessor {
  processSchema(key: string, schema: OpenAPISchema): SchemaNode {
    const type = this.typeMappingVisitor.visit(schema);
    const validations = this.validationExtractionVisitor.visit(schema);
    const fileMetadata = this.fileMetadataVisitor.visit(schema);
    
    return this.schemaNodeFactory.create(key, type, validations, fileMetadata);
  }
}
```

This makes it trivial to add new schema processing operations without modifying existing code.

### Factory Pattern

**Problem:** Different field types (string, number, date, file, enum, array, object) need different React components and different schema node structures. The mapping from type to component should be centralized and extensible.

**Solution:** A Factory creates schema nodes with appropriate defaults and structure based on the field type.

```typescript
class SchemaNodeFactory {
  createObjectNode(key: string, schema: OpenAPISchema): SchemaNode {
    return {
      type: 'object',
      key,
      label: this.resolveLabel(key, schema),
      required: false,
      children: this.processProperties(schema.properties),
    };
  }

  createArrayNode(key: string, schema: OpenAPISchema): SchemaNode {
    return {
      type: 'array',
      key,
      label: this.resolveLabel(key, schema),
      required: false,
      items: this.processSchema(key, schema.items),
    };
  }

  createEnumNode(key: string, schema: OpenAPISchema): SchemaNode {
    return {
      type: 'enum',
      key,
      label: this.resolveLabel(key, schema),
      required: false,
      enumValues: schema.enum,
    };
  }
}
```

### Strategy Pattern

**Problem:** Different authentication endpoints (login, signup, password reset, token refresh) need different detection logic. The detection strategies should be swappable and extensible.

**Solution:** Each authentication type has its own detection strategy that implements a common interface.

```typescript
interface AuthDetectionStrategy {
  detect(operation: OpenAPIOperation, path: string): boolean;
  build(operation: OpenAPIOperation, path: string): AuthEndpoint;
}

class LoginDetectionStrategy implements AuthDetectionStrategy {
  detect(operation: OpenAPIOperation, path: string): boolean {
    // Check explicit annotation
    if (operation['x-uigen-login'] === true) return true;
    if (operation['x-uigen-login'] === false) return false;
    
    // Check path patterns
    if (/\/(login|signin|auth\/login|auth\/signin)$/i.test(path)) {
      return this.hasCredentialFields(operation);
    }
    
    // Check description keywords
    if (operation.description?.match(/\b(login|authenticate|sign in)\b/i)) {
      return this.hasCredentialFields(operation);
    }
    
    return false;
  }

  build(operation: OpenAPIOperation, path: string): LoginEndpoint {
    return {
      type: 'login',
      path,
      method: 'POST',
      requestBody: this.extractRequestBody(operation),
      tokenPath: this.detectTokenPath(operation.responses),
    };
  }
}

// AuthDetector coordinates strategies
class AuthDetector {
  detectLoginEndpoints(): LoginEndpoint[] {
    return this.operations
      .filter(op => this.loginStrategy.detect(op.operation, op.path))
      .map(op => this.loginStrategy.build(op.operation, op.path));
  }
}
```

### Facade Pattern

**Problem:** The adapter coordinates many specialized components (SchemaProcessor, AuthDetector, ResourceExtractor, ParameterProcessor, BodyProcessor, OperationProcessor). The complexity should be hidden behind a simple interface.

**Solution:** OpenAPI3Adapter acts as a facade that orchestrates component interactions and provides a single `adapt()` method.

```typescript
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
    // Simple facade method that coordinates all components
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

The facade reduces the adapter from ~1400 lines to ~250-300 lines of pure orchestration logic.

### Reconciler Pattern

**Problem:** Users need to customize the generated UI (rename labels, hide fields, mark endpoints as login forms) without modifying their spec files, which may be auto-generated or shared across teams.

**Solution:** A Reconciler merges user config annotations into the spec in memory before it reaches the adapter. The reconciliation is non-destructive, idempotent, and deterministic.

```typescript
function reconcile(spec: AnySpec, config: ConfigFile): AnySpec {
  const reconciled = deepClone(spec);

  for (const [elementPath, annotations] of Object.entries(config.annotations)) {
    const element = resolveElementPath(reconciled, elementPath);
    if (element) {
      Object.assign(element, annotations);
    }
  }

  return reconciled;
}
```

### Registry Pattern

**Problem:** The component-to-type mapping needs to be queryable at runtime, and it should be possible to override individual entries without replacing the whole map.

**Solution:** A central Registry maps type strings to React components. The registry is populated at startup and can be extended by plugins.

```typescript
const componentRegistry = new Map<string, React.ComponentType<any>>();

componentRegistry.set('TextField', TextField);
componentRegistry.set('SelectField', SelectField);
componentRegistry.set('DatePicker', DatePicker);

// Plugin can override
componentRegistry.set('TextField', MyCustomTextField);
```

### Proxy Pattern

**Problem:** The generated frontend needs to make live API calls to the real backend, but the browser's same-origin policy would block cross-origin requests.

**Solution:** The CLI starts a proxy server alongside the frontend. All `/api/*` requests from the SPA are forwarded to the real backend by the proxy, which runs on the same origin as the frontend.

```typescript
// In dev mode: Vite proxy config
server: {
  proxy: {
    '/api': {
      target: options.proxyBase,
      changeOrigin: true,
    }
  }
}

// In static mode: Node.js HTTP proxy
app.use('/api', createProxyMiddleware({
  target: options.proxyBase,
  changeOrigin: true,
}));
```

---

## Intermediate Representation

The Intermediate Representation (IR) is the heart of UIGen's architecture. It is a framework-agnostic data structure that describes the entire UI in terms of resources, operations, schemas, and authentication -- without any reference to React, HTML, or CSS.

The IR is what makes UIGen extensible to multiple renderers. The same IR that drives the React SPA could drive a Svelte renderer or a Vue renderer. The parsing layer (adapters) and the rendering layer (React SPA) are completely decoupled.

Here is the full IR type hierarchy:

```typescript
interface UIGenApp {
  meta: AppMeta;
  resources: Resource[];
  auth: AuthConfig;
  dashboard: DashboardConfig;
  servers: ServerConfig[];
}

interface Resource {
  name: string;        // "User", "Product"
  slug: string;        // "users", "products"
  operations: Operation[];
  schema: SchemaNode;
  relationships: Relationship[];
  pagination?: PaginationHint;
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
  children?: SchemaNode[];
  items?: SchemaNode;
  enumValues?: string[];
  format?: string;
  validations?: ValidationRule[];
  uiHint?: UIHint;
}

type ViewHint =
  | "list" | "detail" | "create" | "update" | "delete"
  | "search" | "wizard" | "dashboard" | "action";

type FieldType =
  | "string" | "number" | "integer" | "boolean"
  | "object" | "array" | "enum" | "date" | "file";
```

The `viewHint` field on each `Operation` is particularly important. It is inferred by the adapter based on the HTTP method, path pattern, and response schema. A `GET` on a collection path becomes `"list"`. A `GET` on a resource path with an `{id}` parameter becomes `"detail"`. A `POST` on a collection path becomes `"create"`. A `POST` on a non-CRUD path (like `/users/{id}/activate`) becomes `"action"`.

This inference is what allows UIGen to generate the right view for each operation without any configuration. The adapter does the heavy lifting of understanding the spec's intent.

The `SchemaNode` tree represents the shape of the data. It is a recursive structure that can represent any JSON Schema, including nested objects, arrays of objects, and polymorphic types. The `validations` field carries constraints from the spec (`minLength`, `pattern`, `minimum`, `maximum`) that are used to generate Zod validation schemas for forms.

---

## Config Reconciliation System

The Config Reconciliation System solves a real problem that every API-driven tool faces: users need to customize the generated UI, but they cannot or should not modify their spec files. The spec might be auto-generated from code annotations, shared across multiple tools, or owned by a different team.

UIGen's solution is a `.uigen/config.yaml` file that lives in the project directory. This file contains annotations that are merged into the spec in memory before processing. The source spec file is never touched.

### Core Principles

**Non-destructive:** The source spec file on disk is never modified. All changes happen in memory.

**Idempotent:** Applying the reconciliation twice produces the same result as applying it once. There are no side effects that accumulate.

**Deterministic:** Given the same spec and the same config, the reconciliation always produces the same output. The order of annotations in the config file does not matter.

**Config takes precedence:** If both the spec and the config define the same annotation on the same element, the config value wins.

### Element Path Syntax

The reconciler uses element paths to identify where annotations should be applied.

For operations, the path is `METHOD:/path/to/endpoint`:

```yaml
annotations:
  POST:/api/v1/users:
    x-uigen-ignore: true
  GET:/users/{id}:
    x-uigen-label: "Get User Details"
  DELETE:/items/{itemId}:
    x-uigen-ignore: true
```

For schema properties, the path is `SchemaName.propertyName`:

```yaml
annotations:
  User.email:
    x-uigen-label: "Email Address"
  Product.price:
    x-uigen-label: "Price (USD)"
  User.address.street:
    x-uigen-label: "Street Address"
```

Nested properties use dot notation, and `$ref` references are resolved automatically.

### Generic Annotation Handling

A key design decision is that the reconciler treats all `x-uigen-*` annotations generically. It does not have a hardcoded list of annotation names. This means new annotations work automatically without any changes to the reconciler code.

This follows the open-closed principle: the reconciler is open for extension (new annotations just work) but closed for modification (no code changes needed to support new annotations).

```typescript
// The reconciler does NOT do this:
if (annotation === 'x-uigen-ignore') { ... }
if (annotation === 'x-uigen-label') { ... }

// It does this instead:
for (const [key, value] of Object.entries(annotations)) {
  element[key] = value; // Works for any x-uigen-* annotation
}
```

### Full Config File Structure

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

The `enabled` section declares which annotation types are active. The `defaults` section sets fallback values. The `annotations` section maps element paths to annotation objects.

---

## Styling System

While the IR defines what components to render and how they behave, the Styling System controls how they look. UIGen uses a three-layer architecture that separates base styles, custom themes, and runtime injection.

### Three-Layer Architecture

**Layer 1: Base Styles (Bundled).** The React SPA ships with a base stylesheet (`packages/react/src/index.css`) that includes Tailwind CSS v4 and a comprehensive CSS variable system. These styles are bundled into the SPA at build time and provide the default look and feel. The base layer defines semantic color tokens like `--primary`, `--secondary`, `--background`, `--foreground`, and layout utilities.

**Layer 2: Custom Theme (Per-Project).** Each project can define custom styles in `.uigen/theme.css`. This file overrides or extends the base styles using the same CSS variable system. Users can change brand colors, adjust component styling, add animations, or completely restyle the application. The custom theme is project-specific and lives alongside the spec file and config.

**Layer 3: Runtime Injection (CLI).** The CLI reads `.uigen/theme.css` at startup and injects it into the React SPA via `window.__UIGEN_CSS__`. The SPA applies this CSS after the base styles load, ensuring custom styles take precedence. This happens at runtime, not build time, which means style changes are instant and require no rebuild.

### Runtime Injection Mechanism

The injection happens in the React SPA's entry point:

```typescript
// packages/react/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css'; // Base styles (Layer 1)

// IR injected by CLI
const config = window.__UIGEN_CONFIG__;

// Custom CSS injected by CLI (Layer 2)
const customCSS = window.__UIGEN_CSS__;
if (customCSS) {
  try {
    const styleElement = document.createElement('style');
    styleElement.id = 'uigen-custom-css';
    styleElement.textContent = customCSS;
    document.head.appendChild(styleElement); // Layer 3: Runtime injection
  } catch (error) {
    console.warn('Failed to apply custom CSS:', error);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App config={config} />
  </StrictMode>
);
```

The CLI reads the theme file from disk and injects it as a string:

```typescript
// Simplified CLI injection logic
const themeCSS = fs.existsSync('.uigen/theme.css')
  ? fs.readFileSync('.uigen/theme.css', 'utf-8')
  : null;

const injectedHTML = indexHTML.replace(
  '</head>',
  `<script>window.__UIGEN_CSS__ = ${JSON.stringify(themeCSS)};</script></head>`
);
```

### CSS Variable System

The base styles define a comprehensive set of CSS variables that control the entire visual theme:

```css
/* Base theme variables (packages/react/src/index.css) */
:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --primary: #0a0a0a;
  --primary-foreground: #fafafa;
  --secondary: #f5f5f5;
  --secondary-foreground: #1a1a1a;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --accent: #f5f5f5;
  --accent-foreground: #1a1a1a;
  --destructive: #ef4444;
  --destructive-foreground: #fafafa;
  --border: #e5e5e5;
  --input: #e5e5e5;
  --ring: #0a0a0a;
  --radius: 0.5rem;
}

.dark {
  --background: #0a0a0a;
  --foreground: #e5e5e5;
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  /* ... dark mode variants */
}
```

Custom themes override these variables:

```css
/* .uigen/theme.css */
:root {
  --primary: #10b981;
  --primary-foreground: #ffffff;
  --secondary: #3b82f6;
  --radius: 0.75rem;
}

.dark {
  --primary: #34d399;
  --primary-foreground: #0a0a0a;
}
```

Components reference these variables, so changing a variable instantly updates all components that use it:

```css
/* Button component uses CSS variables */
button.bg-primary {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border-radius: var(--radius);
}
```

### Why Runtime Injection?

The decision to inject styles at runtime rather than at build time has several architectural benefits:

**Instant Updates.** Style changes take effect immediately when you restart the CLI. No rebuild, no recompile, no waiting for Vite to process assets. This makes the styling workflow as fast as the config workflow.

**No Build Dependency.** The React SPA does not need to know about the theme file at build time. The pre-built `dist/` that ships with the npm package works with any theme. This keeps the distribution simple and the runtime footprint minimal.

**Separation of Concerns.** The styling system is completely independent of the IR pipeline. You can change styles without touching the spec, the config, or the adapter logic. The CLI orchestrates both flows but they do not interact.

**Config GUI Integration.** The Config GUI can read and write `.uigen/theme.css` directly, allowing visual theme editing without leaving the browser. The file is just CSS, so any text editor or CSS tool can work with it.

### Integration with Config GUI

The Config GUI provides a visual interface for editing styles. It reads `.uigen/theme.css` via the CLI's file API and presents a color picker, typography controls, and spacing adjustments. Changes are written back to the file, and the user refreshes the preview to see the result.

This workflow mirrors the annotation workflow: the Config GUI is a convenience layer on top of a plain text file. Users can edit `.uigen/theme.css` directly if they prefer, and the Config GUI will reflect those changes.

### Design Decisions

**CSS over JavaScript.** Styles are defined in CSS, not JavaScript objects or CSS-in-JS. This keeps the styling layer framework-agnostic and allows standard CSS tooling (linters, formatters, preprocessors) to work without modification.

**Variables over Hardcoded Values.** The base styles use CSS variables for all theme-related values. This makes theming a matter of overriding variables rather than rewriting selectors. It also enables runtime theme switching (light/dark mode) without JavaScript.

**Tailwind as Foundation.** The base styles include Tailwind CSS, which provides utility classes for layout, spacing, and typography. Custom themes extend Tailwind rather than replacing it, so users get the full power of utility-first CSS without writing it from scratch.

**No Build-Time Preprocessing.** The theme file is plain CSS, not SCSS or Less. This eliminates a build step and keeps the CLI simple. Modern CSS features (variables, nesting, color functions) provide most of what preprocessors offered.

---

## View Types

UIGen auto-generates seven distinct view types, each optimized for a different interaction pattern. The view type is inferred from the operation's HTTP method, path structure, and response schema.

### 1. List View

Generated from `GET /resources`. Renders a sortable, paginated data table using TanStack Table. Columns are derived from the response schema. Pagination is auto-detected: the adapter looks for common pagination patterns in the query parameters (`limit`/`offset`, `page`/`per_page`, `cursor`/`after`) and configures the table accordingly. Row actions (edit, delete, view) are added automatically based on which other operations exist for the resource.

### 2. Detail View

Generated from `GET /resources/{id}`. Renders a read-only view of a single resource. Fields are formatted based on their type and format: dates are localized, URLs become links, booleans become checkboxes. Related resources (detected via `Relationship` nodes in the IR) are shown as links.

### 3. Create and Edit Forms

Generated from `POST` (create) and `PUT`/`PATCH` (edit) endpoints. Forms use React Hook Form for state management and Zod for validation. Validation rules are derived from the spec's JSON Schema constraints. The edit form pre-populates fields from the current record fetched via the detail operation.

### 4. Search View

Generated when query parameters are defined on a `GET` collection endpoint. Renders a search bar and filter controls. Each query parameter becomes a filter input, typed appropriately (text, number, date range, enum select).

### 5. Dashboard View

Auto-generated overview page. Shows all resources with record counts, quick-action buttons, and recent activity. The dashboard is always present and serves as the home page of the generated frontend.

### 6. Multi-Step Wizard

Triggered when a `POST` body has more than eight fields or contains nested objects. Groups fields into logical steps based on object boundaries. Each step is validated before proceeding to the next. This prevents overwhelming users with long single-page forms.

### 7. Custom Actions

Generated from non-CRUD operations like `POST /users/{id}/activate` or `POST /orders/{id}/refund`. Rendered as action buttons on the detail view. Clicking an action button opens a confirmation dialog. If the action has a request body, an input form is shown before confirmation.

---

## CLI Architecture

The CLI is built with Commander.js and exposes a single primary command: `serve`.

```bash
uigen serve ./openapi.yaml [--port 4400] [--proxy-base http://api.example.com]
```

The `serve` command has two modes of operation, depending on how UIGen is installed.

### Dev Mode (Monorepo)

In the monorepo, UIGen runs against the Vite dev server. The CLI:

1. Reads and parses the spec file
2. Runs reconciliation if `.uigen/config.yaml` exists
3. Passes the spec through the adapter to produce the IR
4. Injects the IR into the React SPA's `index.html` as `window.__UIGEN_CONFIG__`
5. Starts a Vite dev server with a proxy configuration that forwards `/api/*` to the real backend

The Vite dev server provides hot module replacement, so changes to the React SPA are reflected instantly. The spec file is watched for changes, and the IR is re-generated and pushed to the browser via WebSocket when the spec changes.

### Static Mode (npm/npx Install)

When installed via npm or run with `npx`, UIGen uses a pre-built `dist/renderer/` directory that ships with the package. The CLI:

1. Reads and parses the spec file
2. Runs reconciliation if `.uigen/config.yaml` exists
3. Passes the spec through the adapter to produce the IR
4. Injects the IR into the pre-built `index.html`
5. Starts a plain Node.js HTTP server that serves the `dist/` directory
6. Adds a built-in proxy middleware that forwards `/api/*` to the real backend

No Vite is required at runtime in static mode. The pre-built SPA is a standard set of HTML, CSS, and JavaScript files that any HTTP server can serve.

### Why Two Modes?

The two-mode design solves a real distribution problem. During development, you want fast iteration with hot reloading. But when you install UIGen via `npx`, you do not want to download Vite and its entire dependency tree just to serve a pre-built file.

Static mode keeps the runtime footprint minimal. The only runtime dependencies are a Node.js HTTP server and a proxy middleware. Everything else is pre-built and bundled.

---

## Conclusion

UIGen's architecture is built around a few core ideas: clear separation of concerns, framework-agnostic data structures, and extensibility through well-known design patterns.

The six-phase adapter refactoring transformed a monolithic ~1400-line "God class" into a clean facade (~250-300 lines) that orchestrates specialized components:

1. **SchemaProcessor** with Visitor and Factory patterns for schema processing
2. **AuthDetector** with Strategy pattern for authentication endpoint detection
3. **ResourceExtractor** for resource inference and extraction
4. **ParameterProcessor** for parameter processing and merging
5. **BodyProcessor** for request/response body processing
6. **OperationProcessor** for operation-level coordination

Each component has a single responsibility and communicates through well-defined interfaces. The Adapter pattern means adding support for a new spec format (GraphQL, gRPC, AsyncAPI) is a matter of writing a new adapter that produces the same IR. The Strategy pattern means adding a new authentication detection strategy or view type is a matter of implementing the strategy interface. The Visitor pattern means adding new schema processing operations requires only a new visitor. The Facade pattern means the adapter remains a simple orchestrator.

The Config Reconciliation System solves the real-world problem of customization without spec modification. The generic annotation handling means the system is open for extension without requiring code changes.

The Styling System provides instant visual customization through runtime CSS injection. The three-layer architecture (base styles, custom theme, runtime injection) keeps styling independent of the IR pipeline while enabling powerful theming capabilities through CSS variables.

The IR is the key to the renderer ecosystem. Because the IR is framework-agnostic, the same parsing and reconciliation infrastructure can drive React, Svelte, Vue, or any future renderer. The rendering layer is a plugin, not a core dependency.

If you want to try UIGen, the quickest way is:

```bash
npx @uigen-dev/cli serve ./your-openapi.yaml
```

If you want to contribute or build on top of UIGen, the `@uigen-dev/core` package exports the adapters, IR types, and reconciler as independent modules. The architecture is designed to be built on, not just used.

We are actively working on Phase 3 features: `x-uigen-*` vendor extensions, `uigen.config.json` for theme overrides, OAuth2 PKCE, and spec hot-reloading. If any of these are important to you, open an issue or submit a PR on GitHub.
