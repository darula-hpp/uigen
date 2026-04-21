---
title: Intermediate Representation
description: The framework-agnostic data model that drives the generated UI.
---

# Intermediate Representation

The Intermediate Representation (IR) is the central data model in UIGen. The adapter produces it from your spec, and the React SPA consumes it to render the UI. Because the IR is framework-agnostic, it can drive any renderer (React today, Svelte and Vue in the future).

The IR is defined in `packages/core/src/ir/types.ts`. The types below are sourced directly from that file.

## `UIGenApp`

The root object. Everything the SPA needs is here.

```typescript
interface UIGenApp {
  meta: AppMeta;
  resources: Resource[];
  auth: AuthConfig;
  dashboard: DashboardConfig;
  servers: ServerConfig[];
  parsingErrors?: ParsingError[];
}
```

## `AppMeta`

Basic metadata from the spec's `info` object.

```typescript
interface AppMeta {
  title: string;
  version: string;
  description?: string;
}
```

## `ServerConfig`

Each entry in the spec's `servers` array becomes a `ServerConfig`. The SPA uses these to populate the environment switcher.

```typescript
interface ServerConfig {
  url: string;
  description?: string;
}
```

## `Resource`

A resource maps to a group of related endpoints (typically a REST resource like `users` or `products`).

```typescript
interface Resource {
  name: string;           // "User", "Product"
  slug: string;           // "users", "products"
  uigenId: string;        // stable identifier for overrides
  description?: string;
  operations: Operation[];
  schema: SchemaNode;     // the primary response schema
  relationships: Relationship[];
  pagination?: PaginationHint;
}
```

## `Operation`

An operation maps to a single HTTP endpoint. The `viewHint` tells the renderer which view to use.

```typescript
interface Operation {
  id: string;
  uigenId: string;
  method: HttpMethod;     // 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string;
  summary?: string;
  description?: string;
  parameters: Parameter[];
  requestBody?: SchemaNode;
  requestContentType?: string;
  responses: Record<string, ResponseDescriptor>;
  viewHint: ViewHint;
  security?: SecurityRequirement[];
}
```

## `ViewHint`

The view hint tells the renderer which UI pattern to use for an operation.

```typescript
type ViewHint =
  | 'list'      // GET /resources: paginated table
  | 'detail'    // GET /resources/{id}: read-only record
  | 'create'    // POST /resources: create form
  | 'update'    // PUT/PATCH /resources/{id}: edit form
  | 'delete'    // DELETE /resources/{id}: confirmation dialog
  | 'search'    // GET with query params: search/filter view
  | 'wizard'    // POST with large/nested body: multi-step form
  | 'dashboard' // overview page
  | 'action';   // non-CRUD operation: action button + dialog
```

## `SchemaNode`

A `SchemaNode` represents a single field or nested object in a request or response schema.

```typescript
interface SchemaNode {
  type: FieldType;
  key: string;
  label: string;
  required: boolean;
  children?: SchemaNode[];    // for object types
  items?: SchemaNode;         // for array types
  enumValues?: string[];
  format?: string;            // 'date', 'email', 'uri', etc.
  validations?: ValidationRule[];
  uiHint?: UIHint;
  description?: string;
  default?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
  nullable?: boolean;
  deprecated?: boolean;
}
```

## `FieldType`

```typescript
type FieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'enum'
  | 'date'
  | 'file';
```

## `AuthConfig`

Authentication configuration extracted from the spec's `securitySchemes`.

```typescript
interface AuthConfig {
  schemes: AuthScheme[];
  globalRequired: boolean;
  loginEndpoints?: LoginEndpoint[];
  refreshEndpoints?: RefreshEndpoint[];
}

interface AuthScheme {
  type: 'bearer' | 'apiKey' | 'oauth2' | 'basic';
  name: string;
  in?: 'header' | 'query' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
}
```

## `PaginationHint`

The adapter detects the pagination strategy from query parameter names.

```typescript
interface PaginationHint {
  style: 'offset' | 'cursor' | 'page';
  params: Record<string, string>; // e.g. { limit: 'limit', offset: 'offset' }
}
```

## `Relationship`

Relationships define connections between resources. They can be explicitly configured or automatically detected from API paths.

```typescript
interface Relationship {
  type: 'hasMany' | 'belongsTo' | 'manyToMany';
  targetResource: string;
  path: string;
  label?: string;
  description?: string;
  isReadOnly: boolean;
}
```

### Relationship Types

- **`hasMany`**: One-to-many relationship (e.g., a user has many orders)
  - Path pattern: `/{sourceResource}/{id}/{targetResource}`
  - Example: `/users/{id}/orders`

- **`belongsTo`**: Many-to-one relationship (e.g., an order belongs to a user)
  - Path pattern: `/{targetResource}/{id}/{sourceResource}`
  - Example: `/users/{id}/orders` (from the order's perspective)

- **`manyToMany`**: Many-to-many relationship (e.g., projects and tags)
  - Detected when symmetric relationships exist in both directions
  - Example: `/projects/{id}/tags` and `/tags/{id}/projects`

### Explicit Type Configuration

Relationship types can be explicitly specified in the `.uigen/config.yaml` file:

```yaml
relationships:
  - source: users
    target: orders
    path: /users/{id}/orders
    type: hasMany  # Explicit type
    label: User Orders
```

When the `type` field is present, it takes precedence over path-based derivation. If omitted, the type is automatically derived from the path pattern for backward compatibility.

## `ValidationRule`

Validation rules are extracted from JSON Schema constraints in the spec.

```typescript
interface ValidationRule {
  type: 'minLength' | 'maxLength' | 'pattern' | 'minimum' | 'maximum'
      | 'minItems' | 'maxItems' | 'email' | 'url';
  value: string | number;
  message?: string;
}
```
