---
title: "Why UIGen Doesn't Generate Code (And Why That's Better)"
author: "Olebogeng Mbedzi"
date: "2026-04-25"
excerpt: "A deep dive into UIGen's runtime rendering architecture and why interpreting configuration at runtime is fundamentally better than generating code for API-driven applications."
tags: ["architecture", "runtime-rendering", "technical", "code-generation"]
---

## Introduction

When developers first encounter UIGen, a common question arises: "Does it generate React code from my OpenAPI spec?" The answer is no, and that is by design.

UIGen does not generate code. It generates an Intermediate Representation (IR) that an intelligent React renderer interprets at runtime. This is not a limitation. It is a fundamental architectural decision that makes UIGen more powerful, more flexible, and easier to maintain than traditional code generators.

This post explains why runtime rendering is superior to code generation for API-driven applications, the technical architecture that makes it work, and the practical benefits you get from this approach.

Whether you are evaluating UIGen for your team, comparing it to code generators like Swagger Codegen or OpenAPI Generator, or just curious about how modern UI generation works, this post will give you a complete picture of why runtime rendering is the future.

---

## The Code Generation Problem

Code generators have been around for decades. The promise is simple: point the generator at a specification, get working code, done. But anyone who has used code generators in production knows the reality is messier.

### Problem 1: Generated Code is Hard to Maintain

Code generators produce thousands of lines of code. For a moderately complex API with 20 resources and 50 endpoints, a typical code generator might produce:

- 50+ React component files (one per view)
- 20+ API client files (one per resource)
- 50+ TypeScript interface files (one per schema)
- Form validation logic scattered across components
- Routing configuration
- State management boilerplate

That is 5,000-10,000 lines of generated code. Now answer these questions:

**When your API changes, do you regenerate?** If yes, you lose any customizations you made to the generated code. If no, your frontend diverges from your API.

**How do you customize the generated code?** You can edit it directly, but then you cannot regenerate without losing changes. You can fork the generator, but then you maintain a fork forever.

**How do you review generated code?** A 10,000-line pull request is not reviewable. You trust the generator or you do not.

**How do you debug generated code?** When something breaks, you wade through thousands of lines of unfamiliar code to find the bug. The generator owns the code, not you.

### Problem 2: One-Time Generation is Fragile

Most code generators are one-time tools. You run them once, get code, and then you are on your own. When your API evolves, you have three bad options:

**Option 1: Regenerate and lose customizations.** You run the generator again, overwriting your changes. Any custom styling, validation logic, or UI tweaks are gone. You start over.

**Option 2: Manually update the generated code.** You edit the generated files to match your new API. This is tedious, error-prone, and defeats the purpose of generation.

**Option 3: Stop using the generator.** You treat the generated code as a starting point and maintain it manually. The generator is now dead weight in your toolchain.

None of these options are good. The fundamental problem is that code generation is a one-way transformation. Once you have code, you cannot easily regenerate without losing work.

### Problem 3: Generated Code is Opinionated

Code generators make decisions for you. They choose:

- Which React patterns to use (class components vs hooks, Redux vs Context)
- How to structure files (flat vs nested, co-located vs separated)
- Which libraries to depend on (Axios vs Fetch, Formik vs React Hook Form)
- How to handle errors (try-catch vs error boundaries)
- How to style components (CSS modules vs styled-components vs Tailwind)

These decisions are baked into the generated code. If you disagree with any of them, you either accept the generator's choices or fork it and maintain your own version.

The generator's opinions become your opinions, whether you like it or not.

### Problem 4: Generated Code is a Black Box

When you generate code, you get a pile of files. The generator's logic is hidden. You cannot easily understand:

- Why a particular component was generated
- How the generator inferred view types
- What assumptions the generator made
- How to extend the generator's behavior

If the generated code does not do what you need, you are stuck. You can edit the code, but you cannot change how the generator works without diving into its source code and forking it.

---

## The Runtime Rendering Alternative

UIGen takes a fundamentally different approach. Instead of generating code, UIGen generates a data structure (the Intermediate Representation) that describes your application. An intelligent React renderer interprets this data structure at runtime to create your UI.

### How It Works

```
OpenAPI Spec + Config
        ↓
   UIGen Core parses
        ↓
  Generates IR (JSON)
        ↓
Renderer interprets at runtime
        ↓
   Live Application
```

The IR is a framework-agnostic description of your application:

```json
{
  "meta": {
    "title": "Meeting Minutes API",
    "version": "1.0.0"
  },
  "resources": [
    {
      "name": "Template",
      "slug": "templates",
      "operations": [
        {
          "id": "listTemplates",
          "method": "GET",
          "path": "/api/v1/templates",
          "viewHint": "list",
          "parameters": [
            {"name": "skip", "type": "integer", "in": "query"},
            {"name": "limit", "type": "integer", "in": "query"}
          ],
          "responses": {
            "200": {
              "schema": {"type": "array", "items": {"$ref": "#/components/schemas/Template"}}
            }
          }
        },
        {
          "id": "createTemplate",
          "method": "POST",
          "path": "/api/v1/templates",
          "viewHint": "create",
          "requestBody": {
            "type": "object",
            "properties": {
              "name": {"type": "string", "label": "Template Name"},
              "file": {"type": "file", "label": "Word Document"}
            }
          }
        }
      ],
      "schema": {
        "type": "object",
        "properties": {
          "id": {"type": "integer"},
          "name": {"type": "string"},
          "description": {"type": "string"},
          "createdAt": {"type": "string", "format": "date-time"}
        }
      }
    }
  ],
  "auth": {
    "type": "bearer",
    "loginEndpoint": "/api/v1/auth/login"
  }
}
```

The renderer reads this IR and creates the appropriate React components:

- `viewHint: "list"` → Renders a TanStack Table with pagination
- `viewHint: "create"` → Renders a React Hook Form with Zod validation
- `type: "file"` → Renders a file upload component
- `format: "date-time"` → Renders a date picker

**No code is generated.** The renderer is smart enough to create any UI from the IR.

### Why This is Better

**1. Instant Updates**

Change your API, regenerate the IR, the renderer adapts instantly. No code to regenerate, no files to overwrite, no customizations to lose.

```bash
# Update your API
# Regenerate the IR (happens automatically)
uigen serve openapi.yaml
# The UI updates instantly
```

The renderer interprets the new IR and creates the updated UI. If you added a field, it appears in forms. If you removed an endpoint, it disappears from the UI. If you changed a type, the validation updates.

**2. Customization Without Forking**

Your customizations live in a separate config file, not in generated code. The config is merged with the spec at runtime, so your customizations survive API changes.

```yaml
# .uigen/config.yaml
annotations:
  Template.name:
    x-uigen-label: "Template Name"
  Template.description:
    x-uigen-widget: "textarea"
  POST:/api/v1/templates:
    x-uigen-ignore: false
```

Change the config, the renderer adapts. No code to edit, no files to regenerate.

**3. Reviewable Configuration**

Instead of reviewing 10,000 lines of generated code, you review a 100-line IR and a 50-line config file. The IR is human-readable JSON. The config is simple YAML.

```bash
# See what changed
git diff .uigen/config.yaml

# Review the IR
cat .uigen/ir.json | jq '.resources[0].operations'
```

The diff is meaningful. You can see exactly what changed and why.

**4. Debuggable Rendering**

When something breaks, you debug the renderer, not generated code. The renderer is open source, well-documented, and designed to be understood.

```typescript
// The renderer is just React components
function ResourceListView({ resource, operations }: ResourceListViewProps) {
  const listOperation = operations.find(op => op.viewHint === 'list');
  const data = useFetchData(listOperation.path);
  
  return (
    <Table
      data={data}
      columns={resource.schema.properties}
      pagination={listOperation.pagination}
    />
  );
}
```

You can read the renderer code, understand how it works, and extend it if needed. It is not a black box.

**5. Extensible by Design**

Want to add a new widget type? Register a new component in the renderer. Want to change how forms are validated? Swap out the validation library. Want to use a different table component? Replace TanStack Table with AG Grid.

The renderer is a plugin system. You extend it without forking.

```typescript
// Register a custom widget
WidgetRegistry.register('richtext', RichTextEditor);

// Use it in your config
annotations:
  Template.description:
    x-uigen-widget: "richtext"
```

The renderer picks up the custom widget and uses it automatically.

---

## The Technical Architecture

UIGen's runtime rendering architecture has three layers, each with a clear responsibility.

### Layer 1: Parsing (UIGen Core)

The core parses your OpenAPI spec and generates the IR. This is where the intelligence lives:

**Resource Extraction:** Identifies resources from path patterns. `/api/v1/templates` and `/api/v1/templates/{id}` are grouped into a `Template` resource.

**Operation Classification:** Infers view types from HTTP methods and paths. `GET /templates` is a list view. `POST /templates` is a create form. `GET /templates/{id}` is a detail view.

**Schema Processing:** Extracts field types, validation rules, and relationships from JSON Schema. `type: "string"` with `format: "email"` becomes an email input with validation.

**Relationship Detection:** Finds foreign key relationships. A field named `categoryId` that references a `Category` schema becomes a dropdown selector.

**Authentication Detection:** Identifies login endpoints from path patterns and annotations. `POST /auth/login` with `x-uigen-login: true` generates a login form.

The core is framework-agnostic. It produces the same IR whether you are rendering with React, Vue, Svelte, or a mobile framework.

### Layer 2: Intermediate Representation (IR)

The IR is a JSON data structure that describes your entire application:

```typescript
interface UIGenApp {
  meta: AppMeta;              // Title, version, description
  resources: Resource[];      // All resources with operations
  auth: AuthConfig;           // Authentication configuration
  dashboard: DashboardConfig; // Dashboard layout
  servers: ServerConfig[];    // API base URLs
}

interface Resource {
  name: string;               // "Template"
  slug: string;               // "templates"
  operations: Operation[];    // List, create, detail, update, delete
  schema: SchemaNode;         // Field definitions
  relationships: Relationship[]; // Foreign keys
  pagination?: PaginationHint;   // Pagination strategy
}

interface Operation {
  id: string;                 // "listTemplates"
  method: HttpMethod;         // "GET"
  path: string;               // "/api/v1/templates"
  viewHint: ViewHint;         // "list", "create", "detail", etc.
  parameters: Parameter[];    // Query, path, header params
  requestBody?: SchemaNode;   // Request payload
  responses: Record<string, ResponseDescriptor>; // Response schemas
}
```

The IR is the contract between the parser and the renderer. As long as the IR format is stable, you can swap out either layer without affecting the other.

### Layer 3: Rendering (React Renderer)

The renderer interprets the IR and creates React components:

**View Selection:** Maps `viewHint` to React components. `"list"` → `ResourceListView`, `"create"` → `ResourceCreateView`, `"detail"` → `ResourceDetailView`.

**Component Mapping:** Maps field types to input components. `"string"` → `TextField`, `"integer"` → `NumberField`, `"date"` → `DatePicker`, `"file"` → `FileUpload`.

**Validation Generation:** Converts JSON Schema constraints to Zod schemas. `minLength: 3` → `z.string().min(3)`, `pattern: "^[A-Z]"` → `z.string().regex(/^[A-Z]/)`.

**Data Fetching:** Generates React Query hooks from operations. `GET /templates` → `useQuery(['templates'], fetchTemplates)`.

**Form Management:** Wires up React Hook Form with Zod validation. The form state, validation, and submission are handled automatically.

The renderer is where the React-specific logic lives. It is open source, well-tested, and designed to be extended.

---

## Practical Benefits

The runtime rendering architecture provides concrete benefits in real-world usage.

### Benefit 1: API Evolution is Painless

Your API changes constantly. New fields are added, old fields are deprecated, endpoints are renamed. With code generation, each change requires regeneration and potential customization loss.

With runtime rendering, API changes are automatic:

```bash
# Backend team adds a new field to Template
# You regenerate the IR
uigen serve openapi.yaml
# The new field appears in forms and tables automatically
```

No code to regenerate. No files to overwrite. No customizations to reapply. The renderer sees the new field in the IR and adds it to the UI.

### Benefit 2: Customization is Declarative

Instead of editing generated code, you declare what you want in a config file:

```yaml
# Hide sensitive fields
annotations:
  User.password:
    x-uigen-ignore: true
  User.ssn:
    x-uigen-ignore: true

# Customize labels
  User.email:
    x-uigen-label: "Email Address"
  User.phoneNumber:
    x-uigen-label: "Phone"

# Define relationships
  Product.categoryId:
    x-uigen-ref:
      resource: "Category"
      valueField: "id"
      labelField: "name"
```

The config is version-controlled, reviewable, and survives API changes. When you regenerate the IR, your customizations are automatically applied.

### Benefit 3: Debugging is Straightforward

When something breaks, you debug the renderer, not thousands of lines of generated code. The renderer is open source and designed to be understood:

```typescript
// packages/react/src/views/ResourceListView.tsx
export function ResourceListView({ resource }: ResourceListViewProps) {
  const listOperation = resource.operations.find(op => op.viewHint === 'list');
  
  if (!listOperation) {
    return <div>No list operation found for {resource.name}</div>;
  }
  
  const { data, isLoading, error } = useFetchData(listOperation);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <Table
      data={data}
      columns={resource.schema.properties}
      onRowClick={(row) => navigate(`/${resource.slug}/${row.id}`)}
    />
  );
}
```

The code is readable. The logic is clear. You can step through it with a debugger and understand exactly what is happening.

### Benefit 4: Extension is Plugin-Based

Want to add a custom widget? Register it:

```typescript
// Register a rich text editor
import { WidgetRegistry } from '@uigen/react';
import RichTextEditor from './RichTextEditor';

WidgetRegistry.register('richtext', RichTextEditor);
```

Use it in your config:

```yaml
annotations:
  Template.description:
    x-uigen-widget: "richtext"
```

The renderer picks up the custom widget automatically. No forking, no code generation, no build step.

### Benefit 5: Testing is Focused

Instead of testing thousands of lines of generated code, you test:

1. **The parser:** Does it correctly extract resources, operations, and schemas from the spec?
2. **The renderer:** Does it correctly interpret the IR and create the right components?
3. **Your config:** Does it correctly customize the generated UI?

The test surface is small and focused. You test the logic, not the output.

---

## Comparison with Code Generators

Let's compare UIGen's runtime rendering with traditional code generators across key dimensions.

### Dimension 1: Maintainability

**Code Generators:**
- Generate 5,000-10,000 lines of code
- Regeneration overwrites customizations
- Manual updates are tedious and error-prone
- Divergence from API is common

**UIGen:**
- Generates a 500-line IR (JSON)
- Customizations live in a separate config file
- Updates are automatic (regenerate IR)
- UI always matches API

**Winner:** UIGen. The IR is small and focused. Customizations survive updates.

### Dimension 2: Customization

**Code Generators:**
- Edit generated code directly (lost on regeneration)
- Fork the generator (maintenance burden)
- Use generator-specific extension points (limited)

**UIGen:**
- Declare customizations in config file (survives updates)
- Register custom components (plugin system)
- Extend the renderer (open source, well-documented)

**Winner:** UIGen. Customizations are declarative and survive updates.

### Dimension 3: Debugging

**Code Generators:**
- Debug thousands of lines of unfamiliar code
- Generator logic is hidden
- Stack traces point to generated code

**UIGen:**
- Debug the renderer (open source, readable)
- Renderer logic is clear and documented
- Stack traces point to renderer code

**Winner:** UIGen. The renderer is designed to be understood.

### Dimension 4: Flexibility

**Code Generators:**
- Generator's opinions are baked into code
- Changing patterns requires forking
- Library choices are fixed

**UIGen:**
- Renderer is a plugin system
- Swap components without forking
- Library choices are configurable

**Winner:** UIGen. The renderer is extensible by design.

### Dimension 5: Performance

**Code Generators:**
- Generated code is static (fast)
- No runtime interpretation overhead
- Bundle size is large (all code included)

**UIGen:**
- Renderer interprets IR at runtime (small overhead)
- IR is loaded once at startup
- Bundle size is small (renderer + IR)

**Winner:** Tie. Code generators have no runtime overhead, but UIGen's overhead is negligible (<50ms) and the bundle size is smaller.

### Dimension 6: Iteration Speed

**Code Generators:**
- Regenerate → Review 10,000 lines → Test → Deploy
- Slow feedback loop
- Customizations must be reapplied

**UIGen:**
- Regenerate IR → Renderer adapts → Test → Deploy
- Fast feedback loop
- Customizations are automatic

**Winner:** UIGen. The feedback loop is instant.

---

## Common Objections

### Objection 1: "I want to see the code"

**Response:** You can. The renderer is open source. You can read every line of code that creates your UI. The difference is that you read the renderer code (which is designed to be understood) instead of generated code (which is designed to be correct).

If you want to see what the renderer does with your specific IR, use the React DevTools. You will see the component tree, props, and state.

### Objection 2: "What if I need to customize something the renderer doesn't support?"

**Response:** You have three options:

1. **Use the config system:** Most customizations are supported via annotations. Hide fields, rename labels, define relationships, customize widgets.

2. **Register a custom component:** If you need a custom widget, register it in the renderer. The renderer will use it automatically.

3. **Extend the renderer:** The renderer is open source. Fork it, add your feature, submit a PR. Or keep your fork if it is too specific.

The renderer is designed to be extended, not forked. Most customizations do not require code changes.

### Objection 3: "Runtime interpretation is slower than static code"

**Response:** The performance difference is negligible. The IR is loaded once at startup and cached in memory. The renderer interprets it in <50ms. After that, the UI is just React components. There is no ongoing interpretation overhead.

In practice, UIGen applications are as fast as hand-written React applications. The bottleneck is always the API, not the renderer.

### Objection 4: "I don't trust a black box renderer"

**Response:** The renderer is not a black box. It is open source, well-documented, and designed to be understood. You can read the code, step through it with a debugger, and understand exactly how it works.

The renderer is less of a black box than generated code. Generated code is thousands of lines of unfamiliar code. The renderer is hundreds of lines of clear, documented code.

### Objection 5: "What if UIGen stops being maintained?"

**Response:** The renderer is open source. If UIGen stops being maintained, you can fork it and maintain it yourself. The renderer is small (a few thousand lines) and has no complex dependencies.

With code generators, if the generator stops being maintained, you are stuck with the last version of generated code. You cannot regenerate without the generator.

---

## The Future of UI Generation

Runtime rendering is not just better for UIGen. It is the future of UI generation.

### Trend 1: Configuration Over Code

Modern tools are moving from code generation to configuration. Terraform does not generate infrastructure code. It interprets configuration at runtime. Kubernetes does not generate deployment scripts. It interprets manifests at runtime.

UIGen applies the same principle to UI generation. Instead of generating React code, it interprets configuration (the IR) at runtime.

### Trend 2: Declarative Over Imperative

Developers want to declare what they want, not how to build it. Declarative systems are easier to understand, easier to maintain, and easier to extend.

UIGen's config system is declarative. You declare that a field should be hidden, not how to hide it. You declare that a field is a foreign key, not how to render a dropdown.

### Trend 3: Runtime Over Build-Time

Modern frameworks are moving from build-time generation to runtime interpretation. Next.js uses runtime rendering for server components. Remix uses runtime rendering for loaders. Astro uses runtime rendering for islands.

UIGen applies the same principle. Instead of generating code at build time, it interprets configuration at runtime.

### Trend 4: Open Source Over Proprietary

Developers trust open source. They want to see the code, understand how it works, and extend it if needed. Proprietary code generators are black boxes.

UIGen's renderer is open source. You can read it, fork it, and contribute to it. The IR format is documented. The config system is extensible.

---

## Conclusion

UIGen does not generate code because runtime rendering is fundamentally better for API-driven applications.

**Code generation is a one-way transformation.** You get code, but you cannot easily regenerate without losing customizations. The generated code is hard to maintain, hard to debug, and hard to extend.

**Runtime rendering is a two-way system.** You get an IR that describes your application and a renderer that interprets it. Customizations live in a separate config file. Updates are automatic. Debugging is straightforward. Extension is plugin-based.

The benefits are concrete:

- **API evolution is painless:** Regenerate the IR, the renderer adapts
- **Customization is declarative:** Config file, not code edits
- **Debugging is straightforward:** Renderer code, not generated code
- **Extension is plugin-based:** Register components, no forking
- **Testing is focused:** Test logic, not output

If you are evaluating UIGen, understand that runtime rendering is not a limitation. It is the core architectural decision that makes UIGen powerful, flexible, and maintainable.

If you are using code generators, consider whether runtime rendering would be a better fit. The initial learning curve is small, but the long-term benefits are significant.

The future of UI generation is runtime rendering. UIGen is leading the way.

---

## Try It Yourself

See runtime rendering in action:

```bash
# Install UIGen
npm install -g @uigen-dev/cli

# Generate the IR from your OpenAPI spec
uigen serve openapi.yaml

# The renderer interprets the IR and creates your UI
# Open http://localhost:4400

# Make changes to your API
# Regenerate the IR (happens automatically)
# The UI updates instantly
```

The renderer is open source. Read the code:

```bash
# Clone the UIGen repository
git clone https://github.com/uigen-dev/uigen.git

# Read the renderer code
cd uigen/packages/react/src/views
ls -la
# ResourceListView.tsx
# ResourceDetailView.tsx
# ResourceCreateView.tsx
# ResourceEditView.tsx
```

The renderer is designed to be understood. Read it, learn from it, extend it.

---

## Further Reading

- [UIGen Architecture: A Deep Dive](/blog/uigen-architecture) - Complete technical architecture
- [Config Reconciliation System](/blog/config-reconciliation-system) - How customizations are merged at runtime
- [Appsmith vs Retool vs UIGen](/blog/appsmith-vs-retool-vs-uigen) - Comparison with low-code builders
- [Building a Meeting Minutes App](/blog/building-meeting-minutes-app) - Real-world example

The UIGen documentation is open source. Contributions are welcome. If you have questions or feedback, open an issue on GitHub.
