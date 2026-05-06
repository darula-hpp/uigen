---
title: "UIGen's Compiler Architecture: A DSL for UI Generation"
author: "Olebogeng Mbedzi"
date: "2026-05-06"
excerpt: "A deep dive into UIGen's compiler architecture, exploring how we built a domain-specific language on top of OpenAPI to transform API specifications into live web applications through runtime compilation."
tags: ["architecture", "compiler", "dsl", "technical"]
---

## Introduction

UIGen is more than an OpenAPI parser. It's a compiler for a domain-specific language (DSL) that transforms API specifications into live web applications. While OpenAPI describes APIs, it lacks UI semantics. We extended it with custom annotations (`x-uigen-*`) that express UI intent, creating a DSL that compiles to a framework-agnostic Intermediate Representation (IR) and renders at runtime.

This post explores UIGen's compiler architecture: the DSL design, the compilation pipeline, the design patterns that make it extensible, and the interesting technical challenges we solved along the way.

Whether you're evaluating UIGen, building a plugin, or curious about compiler design for UI generation, this post provides a complete technical picture of how the system works.

---

## The DSL: Extending OpenAPI with UI Semantics

OpenAPI describes APIs but lacks UI semantics. It tells you what endpoints exist and what data they accept, but not how to render them. We extended OpenAPI with `x-uigen-*` annotations that express UI intent:

```yaml
paths:
  /api/users/{id}:
    get:
      x-uigen-profile: true        # Render as profile view
      x-uigen-layout:
        strategy: centered
        maxWidth: 800px
  /api/analytics:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                properties:
                  data:
                    type: array
                    x-uigen-chart:       # Visualize as chart
                      chartType: line
                      xAxis: date
                      yAxis: revenue
                      options:
                        title: "Revenue Over Time"
```

### Available Annotations

The DSL includes annotations for different UI concerns:

**Data Visualization:**
- `x-uigen-chart`: Configure charts (line, bar, pie, scatter, area, radar, donut)

**View Semantics:**
- `x-uigen-profile`: Mark resources as profile views
- `x-uigen-landing-page`: Configure landing page sections (hero, features, pricing, testimonials, FAQ, CTA)
- `x-uigen-ignore`: Exclude endpoints from UI generation

**Layout Control:**
- `x-uigen-layout`: Define layout strategies (sidebar, centered, dashboard grid)

**Field Customization:**
- `x-uigen-label`: Human-readable field labels
- `x-uigen-ref`: Define relationships between resources

**Authentication:**
- `x-uigen-login`: Mark login endpoints
- `x-uigen-signup`: Mark signup endpoints
- `x-uigen-password-reset`: Mark password reset endpoints

### Extensible Annotation System

The annotation system is extensible via a handler registry. Each handler implements three methods:

```typescript
interface AnnotationHandler<T> {
  name: string;
  extract(context: AnnotationContext): T | undefined;
  validate(value: T): boolean;
  apply(value: T, context: AnnotationContext): void;
}
```

Example handler for `x-uigen-chart`:

```typescript
export class ChartHandler implements AnnotationHandler<ChartAnnotation> {
  public readonly name = 'x-uigen-chart';

  extract(context: AnnotationContext): ChartAnnotation | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-chart'];
    
    if (typeof annotation !== 'object' || annotation === null) {
      return undefined;
    }
    
    return annotation as ChartAnnotation;
  }

  validate(value: ChartAnnotation): boolean {
    // Validate chartType
    if (!VALID_CHART_TYPES.includes(value.chartType)) {
      console.warn(`Invalid chartType: ${value.chartType}`);
      return false;
    }
    
    // Validate required fields
    if (!value.xAxis || !value.yAxis) {
      console.warn('xAxis and yAxis are required');
      return false;
    }
    
    return true;
  }

  apply(value: ChartAnnotation, context: AnnotationContext): void {
    // Validate array field type requirement
    if (context.schemaNode?.type !== 'array') {
      context.utils.logWarning(
        `x-uigen-chart can only be applied to array fields`
      );
      return;
    }
    
    // Set chartConfig on schema node
    context.schemaNode.chartConfig = {
      chartType: value.chartType,
      xAxis: value.xAxis,
      yAxis: value.yAxis,
      series: value.series,
      labels: value.labels,
      options: value.options
    };
  }
}
```

New annotations work automatically without modifying the reconciler or adapter code. This follows the open-closed principle: the system is open for extension but closed for modification.

---

## Compiler Architecture

UIGen follows a classic compiler pipeline with five stages:

```
CLI Command
    |
    v
+----------------+     +----------------+     +----------------------+     +----------+     +--------+     +--------------+
| API Document   |---->| Reconciler     |---->| Annotation           |---->| Adapter  |---->|   IR     |---->| Renderer     |
| (YAML/JSON)    |     | (Config Merge) |     | Processing           |     | (Parser) |     |          |     | (React SPA)  |
+----------------+     +----------------+     +----------------------+     +----------+     +--------+     +--------------+
       |                      ^                                                                                    |
       |                      |                                                                                    |
       |               +----------------+                                                                          |
       |               | Config File    |                                                          +-----------+   |
       |               | (.uigen/       |                                                          | API Proxy |---+
       |               |  config.yaml)  |                                                          +-----------+
       |               +----------------+
       |
       +---> (Source spec unchanged on disk)
```

### Stage 1: Lexing and Parsing

The CLI reads the spec file and auto-detects the format:

```typescript
export async function parseSpec(content: string): Promise<UIGenApp> {
  let doc: unknown;

  try {
    doc = JSON.parse(content);
  } catch {
    doc = yaml.load(content);
  }

  const spec = doc as Record<string, unknown>;

  // Check for OpenAPI 3.x
  if ('openapi' in spec && spec.openapi.startsWith('3.')) {
    const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
    return adapter.adapt();
  }

  // Check for Swagger 2.0
  if (Swagger2Adapter.canHandle(spec)) {
    const adapter = new Swagger2Adapter(spec);
    return adapter.adapt();
  }

  throw new Error('Unsupported spec version');
}
```

### Stage 2: Reconciliation

Before the spec reaches the adapter, the Reconciler merges user config annotations into the spec in memory. The source file is never modified:

```typescript
function reconcile(spec: AnySpec, config: ConfigFile): AnySpec {
  const reconciled = deepClone(spec);

  for (const [elementPath, annotations] of Object.entries(config.annotations)) {
    const element = resolveElementPath(reconciled, elementPath);
    if (element) {
      // Config annotations take precedence over spec annotations
      Object.assign(element, annotations);
    }
  }

  return reconciled;
}
```

Element paths identify where annotations should be applied:
- Operations: `POST:/api/users`
- Schema properties: `User.email`
- Nested properties: `User.address.street`

### Stage 3: Annotation Processing

The registry executes handlers in priority order to handle dependencies:

```typescript
export class AnnotationHandlerRegistry {
  processAnnotations(context: AnnotationContext): void {
    // Define processing order (ignore must run first)
    const priorityOrder = [
      'x-uigen-ignore',
      'x-uigen-login',
      'x-uigen-label',
      'x-uigen-ref'
    ];
    
    // Process priority handlers first
    for (const name of priorityOrder) {
      const handler = this.get(name);
      if (handler) {
        this.executeHandler(handler, context);
      }
    }
    
    // Process remaining handlers
    for (const handler of this.getAll()) {
      if (!priorityOrder.includes(handler.name)) {
        this.executeHandler(handler, context);
      }
    }
  }
}
```

### Stage 4: IR Generation

The adapter normalizes the annotated spec into a framework-agnostic IR:

```typescript
interface UIGenApp {
  meta: AppMeta;
  resources: Resource[];      // Inferred from paths
  auth: AuthConfig;            // From securitySchemes
  dashboard: DashboardConfig;
  servers: ServerConfig[];
}

interface Resource {
  name: string;
  operations: Operation[];
  schema: SchemaNode;          // Recursive tree
  relationships: Relationship[];
  pagination?: PaginationHint;
}

interface Operation {
  id: string;
  method: HttpMethod;
  path: string;
  viewHint: ViewHint;          // list, detail, create, update, delete, etc.
  parameters: Parameter[];
  requestBody?: SchemaNode;
  responses: Record<string, ResponseDescriptor>;
}
```

### Stage 5: Rendering

The IR is injected as `window.__UIGEN_CONFIG__` and interpreted by the React renderer at runtime. The renderer maps IR nodes to React components:

- `viewHint: "list"` → `ResourceListView` with TanStack Table
- `viewHint: "create"` → `ResourceCreateView` with React Hook Form
- `type: "file"` → `FileUpload` component
- `chartConfig` → Chart component with Recharts

---

## Design Patterns

UIGen uses eight design patterns to solve specific architectural problems:

### Adapter Pattern

**Problem:** OpenAPI 3.x and Swagger 2.0 have different structures. The rest of the system should not need to know which format it's dealing with.

**Solution:** Each spec format has its own adapter that normalizes to the IR:

```typescript
class OpenAPI3Adapter {
  adapt(): UIGenApp {
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

### Visitor Pattern

**Problem:** Schema processing involves multiple independent operations (type mapping, validation extraction, file metadata) that should not be coupled to schema structure.

**Solution:** Separate visitors for each operation:

```typescript
class TypeMappingVisitor implements SchemaVisitor {
  visit(schema: OpenAPISchema): FieldType {
    if (schema.type === 'string' && schema.format === 'date') return 'date';
    if (schema.type === 'string' && schema.format === 'binary') return 'file';
    if (schema.enum) return 'enum';
    return schema.type as FieldType;
  }
}
```

### Factory Pattern

**Problem:** Different field types need different schema node structures and defaults.

**Solution:** Factory creates nodes with appropriate structure:

```typescript
class SchemaNodeFactory {
  createArrayNode(key: string, schema: OpenAPISchema): SchemaNode {
    return {
      type: 'array',
      key,
      label: this.resolveLabel(key, schema),
      required: false,
      items: this.processSchema(key, schema.items),
    };
  }
}
```

### Strategy Pattern

**Problem:** Different authentication types need different detection logic.

**Solution:** Swappable detection strategies:

```typescript
class LoginDetectionStrategy implements AuthDetectionStrategy {
  detect(operation: OpenAPIOperation, path: string): boolean {
    if (operation['x-uigen-login'] === true) return true;
    if (/\/(login|signin)$/i.test(path)) {
      return this.hasCredentialFields(operation);
    }
    return false;
  }
}
```

### Facade Pattern

**Problem:** The adapter coordinates many specialized components. Complexity should be hidden.

**Solution:** OpenAPI3Adapter acts as a facade:

```typescript
class OpenAPI3Adapter {
  private schemaProcessor: SchemaProcessor;
  private authDetector: AuthDetector;
  private resourceExtractor: ResourceExtractor;
  // ... 7+ specialized processors

  adapt(): UIGenApp {
    // Simple facade method
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

### Registry Pattern

**Problem:** Component-to-type mapping needs to be queryable and extensible.

**Solution:** Central registry for handlers and components:

```typescript
export class AnnotationHandlerRegistry {
  private handlers: Map<string, AnnotationHandler> = new Map();
  
  register(handler: AnnotationHandler): void {
    this.handlers.set(handler.name, handler);
  }
  
  get(name: string): AnnotationHandler | undefined {
    return this.handlers.get(name);
  }
}
```

### Proxy Pattern

**Problem:** Browser same-origin policy blocks cross-origin API requests.

**Solution:** CLI proxies `/api/*` requests to the real backend:

```typescript
server: {
  proxy: {
    '/api': {
      target: options.proxyBase,
      changeOrigin: true,
    }
  }
}
```

---

## Interesting Technical Challenges

### Challenge 1: DSL Design - Extending OpenAPI Without Breaking It

OpenAPI allows vendor extensions with the `x-*` prefix. We use this to add UI annotations while keeping specs valid:

```yaml
# Valid OpenAPI 3.x spec with UIGen annotations
openapi: 3.0.0
paths:
  /api/users/{id}:
    get:
      x-uigen-profile: true
      x-uigen-layout:
        strategy: centered
```

Each annotation has metadata describing its target type, parameter schema, and examples:

```typescript
public static readonly metadata: AnnotationMetadata = {
  name: 'x-uigen-chart',
  description: 'Configures data visualization as charts for array fields',
  targetType: 'field',
  applicableWhen: {
    type: 'array'
  },
  parameterSchema: {
    type: 'object',
    properties: {
      chartType: {
        type: 'enum',
        enum: ['line', 'bar', 'pie', 'scatter', 'area', 'radar', 'donut']
      },
      xAxis: { type: 'string' },
      yAxis: { type: ['string', 'array'] }
    },
    required: ['chartType', 'xAxis', 'yAxis']
  }
};
```

The registry processes handlers in priority order to handle dependencies (e.g., `x-uigen-ignore` must run before other handlers).

### Challenge 2: Reference Resolution

OpenAPI specs use `$ref` pointers extensively. The SchemaResolver handles:

- **Local refs:** `#/components/schemas/User`
- **Circular references:** User → Address → User
- **Deep nesting with caching**

```typescript
class SchemaResolver {
  private cache: Map<string, SchemaNode> = new Map();
  
  resolve(ref: string): SchemaNode {
    if (this.cache.has(ref)) {
      return this.cache.get(ref)!;
    }
    
    const schema = this.extractSchemaFromRef(ref);
    const node = this.processSchema(schema);
    this.cache.set(ref, node);
    
    return node;
  }
}
```

### Challenge 3: Resource Inference

OpenAPI has no explicit resource definitions. The ResourceExtractor infers them by:

- **Grouping paths by common prefixes:** `/api/users` and `/api/users/{id}` → `User` resource
- **Detecting CRUD patterns:** GET/POST/PUT/DELETE operations
- **Identifying relationships:** Path parameters and response schemas

```typescript
class ResourceExtractor {
  extractResources(): Resource[] {
    const pathGroups = this.groupPathsByResource();
    
    return pathGroups.map(group => ({
      name: this.inferResourceName(group.paths),
      slug: this.inferResourceSlug(group.paths),
      operations: this.extractOperations(group.paths),
      schema: this.inferResourceSchema(group.paths),
      relationships: this.detectRelationships(group.paths)
    }));
  }
}
```

### Challenge 4: Config Reconciliation

Users override spec annotations via `.uigen/config.yaml`. The reconciler:

- **Parses element paths:** `POST:/api/users`, `User.email`
- **Deep clones the spec:** Never mutates source
- **Merges with config precedence:** Config wins over spec
- **Validates output integrity:** Ensures valid OpenAPI

Property-based testing with fast-check verifies 20+ correctness properties (idempotence, determinism, precedence) across 100+ iterations each:

```typescript
fc.assert(
  fc.property(
    specArbitrary,
    configArbitrary,
    (spec, config) => {
      const result1 = reconcile(spec, config);
      const result2 = reconcile(result1, config);
      expect(result1).toEqual(result2); // Idempotence
    }
  ),
  { numRuns: 100 }
);
```

### Challenge 5: View Classification

Operations are classified into view types based on:

- **HTTP method:** GET → list/detail, POST → create, PUT/PATCH → update
- **Path structure:** Collection vs resource paths
- **Request/response schemas:** Field count and complexity
- **Field count heuristic:** >8 fields → wizard view

```typescript
class ViewHintClassifier {
  classify(operation: Operation): ViewHint {
    if (operation.method === 'GET' && this.isCollectionPath(operation.path)) {
      return 'list';
    }
    
    if (operation.method === 'GET' && this.hasIdParameter(operation.path)) {
      return 'detail';
    }
    
    if (operation.method === 'POST' && this.isCollectionPath(operation.path)) {
      const fieldCount = this.countFields(operation.requestBody);
      return fieldCount > 8 ? 'wizard' : 'create';
    }
    
    return 'action';
  }
}
```

---

## Runtime vs AOT Compilation

UIGen is a **runtime compiler**. The IR is injected as `window.__UIGEN_CONFIG__` and interpreted by the renderer at runtime.

### Benefits

**Zero maintenance:** UI stays in sync with API changes. Regenerate the IR, the renderer adapts instantly.

**No build step:** End users don't need Vite or webpack. The pre-built renderer works with any IR.

**Framework-agnostic IR:** The same IR can drive React, Svelte, or Vue renderers.

### Tradeoffs

**No compile-time optimizations:** No dead code elimination or constant folding since the IR is declarative.

**Runtime interpretation overhead:** The IR is parsed at startup (~50ms for typical APIs).

**Bundle includes renderer:** The renderer is ~200KB gzipped. Generated code might be smaller for simple APIs.

In practice, the IR is small (~100KB for typical APIs) and parsing is fast. The bottleneck is always the API, not the renderer.

---

## Validation and Testing

The compiler is validated through multiple testing strategies:

**Unit tests:** Each processor, detector, and handler has focused unit tests.

**Property-based tests:** The reconciler has 20+ universal correctness properties verified with fast-check:
- Idempotence: Applying twice = applying once
- Determinism: Same input → same output
- Config precedence: Config wins over spec
- Source non-mutation: Original spec unchanged

**Integration tests:** End-to-end with real OpenAPI specs (Stripe, Twilio, Petstore).

**E2E tests:** Generated UIs tested with Playwright for visual regression and interaction flows.

---

## Code Structure

The monorepo is organized by compilation stage:

```
uigen/
├── packages/
│   ├── core/                      # Framework-agnostic compiler
│   │   └── src/
│   │       ├── adapter/           # OpenAPI3Adapter, Swagger2Adapter
│   │       │   ├── openapi3.ts
│   │       │   ├── schema-processor.ts
│   │       │   ├── auth-detector.ts
│   │       │   ├── resource-extractor.ts
│   │       │   └── annotations/
│   │       │       ├── registry.ts
│   │       │       └── handlers/
│   │       │           ├── chart-handler.ts
│   │       │           ├── profile-handler.ts
│   │       │           └── landing-page-handler.ts
│   │       ├── ir/                # IR types
│   │       ├── reconciler/        # Config reconciliation
│   │       └── engine/            # IR → ComponentDescriptor
│   │
│   ├── react/                     # React renderer
│   │   └── src/
│   │       ├── components/
│   │       │   ├── fields/        # TextField, DatePicker, FileUpload
│   │       │   └── views/         # ListView, DetailView, FormView
│   │       ├── registry/          # Component registry
│   │       └── renderer/          # Dynamic renderer
│   │
│   └── cli/                       # CLI entry point
│       └── src/
│           ├── commands/          # serve, config, init
│           └── server.ts          # Vite server + proxy
```

---

## Open Questions

We're exploring several compiler design questions:

**1. Is this actually a compiler?**

It has lexing, parsing, IR, and code generation, but the "code" is React components rendered at runtime. Does runtime interpretation count as compilation?

**2. Does extending OpenAPI with semantic annotations make it a DSL?**

The annotations have semantic meaning (chart config, layout strategies) beyond API description. Is this a new language or just OpenAPI with metadata?

**3. Better approaches for resource inference?**

Current heuristics work for REST APIs but struggle with RPC-style specs. Should we require explicit resource declarations?

**4. IR optimization opportunities?**

Currently no dead code elimination or constant folding since the IR is declarative. Could we optimize the IR before rendering?

---

## Conclusion

UIGen is a compiler for a DSL built on OpenAPI. The DSL extends OpenAPI with UI semantics through `x-uigen-*` annotations. The compiler transforms this DSL into a framework-agnostic IR through a five-stage pipeline: parsing, reconciliation, annotation processing, IR generation, and rendering.

The architecture uses classic compiler design patterns (Adapter, Visitor, Factory, Strategy, Facade, Registry, Proxy) to create an extensible system where new annotations work automatically without code changes.

The runtime compilation approach provides zero-maintenance UI that stays in sync with API changes, declarative customization through config files, and framework-agnostic IR that enables multiple renderers.

Whether you're building a plugin, evaluating UIGen, or exploring compiler design for UI generation, understanding this architecture provides insight into how modern API-driven tools can leverage compiler techniques to transform specifications into live applications.

---

## Try It Yourself

See the compiler in action with our complete meeting minutes example:

```bash
# Clone the repository
git clone https://github.com/darula-hpp/uigen.git
cd uigen/examples/apps/fastapi/meeting-minutes

# Start the FastAPI backend
docker compose up -d
docker compose exec app alembic upgrade head

# Start the UIGen compiler
npx @uigen-dev/cli@latest serve openapi.yaml --proxy-base http://localhost:8000

# The compiler:
# 1. Parses the OpenAPI spec
# 2. Reconciles .uigen/config.yaml annotations
# 3. Processes x-uigen-* annotations
# 4. Generates the IR
# 5. Renderer interprets it at runtime
#
# Open http://localhost:4400
```

This example includes:
- **Authentication:** Login/signup with JWT tokens
- **File uploads:** Word document templates with size validation
- **Charts:** Meeting duration analytics visualization
- **Relationships:** Users → Templates → Meetings
- **Custom styling:** Dark theme in `.uigen/theme.css`
- **Annotations:** Profile views, charts, labels, and layouts

Explore the compiler source code:

```bash
# View the adapter (parsing stage)
cd packages/core/src/adapter
ls -la
# openapi3.ts - Main adapter facade
# schema-processor.ts - Schema traversal
# resource-extractor.ts - Resource inference
# annotations/ - Annotation handlers

# View annotation handlers
cd annotations/handlers
ls -la
# chart-handler.ts - x-uigen-chart
# profile-handler.ts - x-uigen-profile
# landing-page-handler.ts - x-uigen-landing-page
# layout-handler.ts - x-uigen-layout
```

---

## Further Reading

- [UIGen Architecture: A Deep Dive](/blog/uigen-architecture) - Complete technical architecture
- [Runtime Rendering vs Code Generation](/blog/runtime-rendering-vs-code-generation) - Why runtime compilation is better
- [Config Reconciliation System](/docs/core-concepts/config-reconciliation) - How customizations are merged
- [Annotation Reference](/docs/spec-annotations) - Complete annotation documentation

The UIGen documentation is open source. Contributions welcome on [GitHub](https://github.com/darula-hpp/uigen).
