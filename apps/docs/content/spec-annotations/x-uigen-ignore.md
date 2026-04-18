---
title: x-uigen-ignore
description: Exclude operations, schemas, properties, parameters, or request/response bodies from the generated UI.
---

# x-uigen-ignore

The `x-uigen-ignore` annotation allows you to exclude any element in your OpenAPI/Swagger spec from the generated UI. When an element is marked with `x-uigen-ignore: true`, it is filtered out during IR construction and will not appear in any generated views, forms, or API configurations.

## Purpose

Use `x-uigen-ignore` when:

- You have internal or admin-only endpoints that should not appear in the public UI
- You want to hide deprecated endpoints while keeping them in the spec
- You have utility endpoints (health checks, metrics) that don't need UI representation
- You want to exclude sensitive or internal fields from generated forms and views
- You need to hide debug parameters or internal request/response structures
- You want to exclude specific elements without removing them from the spec

## How it works

`x-uigen-ignore` is a filtering mechanism that operates at the adapter layer, before elements reach the view hint classifier or relationship detector. When an element is marked with `x-uigen-ignore: true`, the adapter stops processing at that node and does not evaluate any nested children (pruning behavior).

When all operations for a resource are ignored, the entire resource is excluded from the IR.

## Supported values

`x-uigen-ignore` accepts **boolean values only**:

- `true`: exclude the operation from the generated UI
- `false`: include the operation explicitly (useful for overriding path-level annotations)

Non-boolean values (strings, numbers, objects, arrays, null) are treated as absent and a warning is logged.

## Supported locations

`x-uigen-ignore` can be applied to any of the following OpenAPI/Swagger spec elements:

| Location | Effect |
|---|---|
| Schema property | Excludes a single property from all generated forms and views |
| Schema object | Excludes an entire schema and all its properties from the UI |
| Parameter | Excludes a query, path, header, or cookie parameter from forms and API calls |
| Request body | Excludes the request body from an operation (no input form generated) |
| Response | Excludes a response from an operation (no detail view or table columns) |
| Operation | Excludes a single operation from the UI |
| Path item | Excludes all operations on that path (can be overridden per operation) |

## Pruning behavior

When an element is marked with `x-uigen-ignore: true`, the adapter uses a pruning strategy: it stops processing at that node and does not evaluate any nested children or referenced schemas.

**Example**: If a schema object is ignored, none of its properties are processed:

```yaml
components:
  schemas:
    InternalMetrics:
      type: object
      x-uigen-ignore: true  # Stop here
      properties:
        cpu_usage:
          type: number  # Not processed
        memory_usage:
          type: number  # Not processed
```

**Example**: If a request body is ignored, its schema is not processed:

```yaml
paths:
  /internal/sync:
    post:
      requestBody:
        x-uigen-ignore: true  # Stop here
        content:
          application/json:
            schema:
              type: object  # Not processed
              properties:
                data:
                  type: string  # Not processed
```

This pruning behavior improves performance by avoiding unnecessary processing of ignored subtrees.

## Precedence

When `x-uigen-ignore` appears at multiple levels in the spec hierarchy, the most specific (child-level) annotation takes precedence. This allows you to override parent-level ignores for specific child elements.

### Precedence hierarchy

```
Property-level annotation
    ↓ (if undefined)
Schema object-level annotation
    ↓ (if undefined)
Parameter-level annotation
    ↓ (if undefined)
Operation-level annotation
    ↓ (if undefined)
Path-level annotation
    ↓ (if undefined)
Default: include (false)
```

**Rule**: Child annotations override parent annotations. An explicit `false` at the child level overrides `true` at the parent level, and vice versa.

### Precedence examples

| Parent annotation | Child annotation | Result |
|---|---|---|
| `true` | `false` | Child is **included** (override) |
| `false` | `true` | Child is **excluded** (override) |
| `true` | (absent) | Child is **excluded** (inherited) |
| `false` | (absent) | Child is **included** (inherited) |
| (absent) | `true` | Child is **excluded** |
| (absent) | `false` | Child is **included** |
| (absent) | (absent) | Child is **included** (default) |

## OpenAPI 3.x examples

### Exclude a schema property

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
        password_hash:
          type: string
          x-uigen-ignore: true
          # This property is excluded from all forms and views
        internal_id:
          type: string
          x-uigen-ignore: true
          # This property is excluded from all forms and views
```

### Exclude an entire schema object

```yaml
components:
  schemas:
    InternalMetrics:
      type: object
      x-uigen-ignore: true
      # Entire schema excluded - properties not processed
      properties:
        cpu_usage:
          type: number
        memory_usage:
          type: number
    User:
      type: object
      properties:
        id:
          type: integer
        metrics:
          $ref: '#/components/schemas/InternalMetrics'
          # This property is excluded because it references an ignored schema
```

### Exclude a parameter

```yaml
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
          # This parameter appears in the UI
        - name: debug
          in: query
          schema:
            type: boolean
          x-uigen-ignore: true
          # This parameter is excluded from forms and API calls
```

### Exclude a request body

```yaml
paths:
  /internal/sync:
    post:
      summary: Internal sync operation
      requestBody:
        x-uigen-ignore: true
        # Request body excluded - no input form generated
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: string
      responses:
        '200':
          description: Success
```

### Exclude a response

```yaml
paths:
  /users/{id}:
    get:
      summary: Get user
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
          # This response appears in detail views
        '500':
          description: Internal error details
          x-uigen-ignore: true
          # This response is excluded from the UI
          content:
            application/json:
              schema:
                type: object
```

### Exclude a single operation

```yaml
paths:
  /users:
    get:
      summary: List users
      # This operation appears in the UI
    post:
      summary: Create user
      # This operation appears in the UI
  /users/{id}:
    get:
      summary: Get user
      # This operation appears in the UI
    delete:
      summary: Delete user
      x-uigen-ignore: true
      # This operation is excluded from the UI
```

### Exclude all operations on a path

```yaml
paths:
  /admin/users:
    x-uigen-ignore: true
    get:
      summary: List users (admin)
      # Excluded (inherited from path)
    post:
      summary: Create user (admin)
      # Excluded (inherited from path)
    delete:
      summary: Delete user (admin)
      # Excluded (inherited from path)
```

### Override path-level annotation for specific operation

```yaml
paths:
  /internal/metrics:
    x-uigen-ignore: true
    get:
      summary: Get metrics
      # Excluded (inherited from path)
    post:
      summary: Reset metrics
      x-uigen-ignore: false
      # Included (overrides path-level annotation)
```

### Override schema-level annotation for specific property

```yaml
components:
  schemas:
    InternalUser:
      type: object
      x-uigen-ignore: true
      # Parent says ignore all properties
      properties:
        id:
          type: integer
          x-uigen-ignore: false
          # Included (overrides schema-level annotation)
        name:
          type: string
          # Excluded (inherits schema-level annotation)
        internal_data:
          type: object
          # Excluded (inherits schema-level annotation)
```

### Override path-level parameter for specific operation

```yaml
paths:
  /users:
    parameters:
      - name: debug
        in: query
        schema:
          type: boolean
        x-uigen-ignore: true
        # Excluded from all operations by default
    get:
      summary: List users
      parameters:
        - name: debug
          in: query
          schema:
            type: boolean
          x-uigen-ignore: false
          # Included (overrides path-level annotation)
```

### Exclude entire resource

When all operations for a resource are ignored, the resource is automatically excluded:

```yaml
paths:
  /health:
    get:
      summary: Health check
      x-uigen-ignore: true
  /health/detailed:
    get:
      summary: Detailed health check
      x-uigen-ignore: true
# The "health" resource will not appear in the UI at all
```

## Swagger 2.0 examples

### Exclude a schema property

```yaml
definitions:
  User:
    type: object
    properties:
      id:
        type: integer
      name:
        type: string
      password_hash:
        type: string
        x-uigen-ignore: true
```

### Exclude an entire schema object

```yaml
definitions:
  InternalMetrics:
    type: object
    x-uigen-ignore: true
    properties:
      cpu_usage:
        type: number
```

### Exclude a parameter

```yaml
paths:
  /users:
    get:
      parameters:
        - name: limit
          in: query
          type: integer
        - name: debug
          in: query
          type: boolean
          x-uigen-ignore: true
```

### Exclude a response

```yaml
paths:
  /users/{id}:
    get:
      responses:
        200:
          description: Success
          schema:
            $ref: '#/definitions/User'
        500:
          description: Internal error
          x-uigen-ignore: true
          schema:
            type: object
```

### Exclude a single operation

```yaml
paths:
  /users/{id}:
    delete:
      summary: Delete user
      x-uigen-ignore: true
```

### Exclude all operations on a path

```yaml
paths:
  /admin/users:
    x-uigen-ignore: true
    get:
      summary: List users (admin)
    post:
      summary: Create user (admin)
```

## Interaction with other annotations

`x-uigen-ignore` is checked before any other `x-uigen-*` annotations are processed. This means:

### With `x-uigen-login`

If an operation has both `x-uigen-ignore: true` and `x-uigen-login: true`, the operation is excluded from the IR and does not appear in `auth.loginEndpoints`:

```yaml
paths:
  /auth/admin-login:
    post:
      summary: Admin login
      x-uigen-login: true
      x-uigen-ignore: true
      # Operation is excluded, not processed as login endpoint
```

### With `x-uigen-label`

If an operation has both `x-uigen-ignore: true` and `x-uigen-label`, the operation is excluded and the label is never applied:

```yaml
paths:
  /users/{id}/archive:
    post:
      summary: Archive user
      x-uigen-label: Archive User
      x-uigen-ignore: true
      # Operation is excluded, label is not used
```

### With `x-uigen-id`

If an operation has both `x-uigen-ignore: true` and `x-uigen-id`, the operation is excluded and the ID is never used:

```yaml
paths:
  /users/{id}/internal-action:
    post:
      summary: Internal action
      x-uigen-id: user-internal
      x-uigen-ignore: true
      # Operation is excluded, ID is not used
```

## Relationship detection

When a resource is excluded because all its operations are ignored, no other resource will have relationship links pointing to it. This is automatic (the relationship detector only operates on resources that appear in the IR).

## Default behavior

Without `x-uigen-ignore`, all operations are included in the generated UI (default behavior). The annotation is entirely optional.

## Validation

The adapter validates `x-uigen-ignore` values and provides feedback:

- **Non-boolean value**: Warning logged: `x-uigen-ignore must be a boolean, found <type>`. Operation is included (treated as absent).
- **All operations ignored**: Warning logged: `All operations were ignored - no resources will be generated`. Empty resources array returned.
- **Operation ignored**: Info logged: `Ignoring operation: <METHOD> <path>`.

