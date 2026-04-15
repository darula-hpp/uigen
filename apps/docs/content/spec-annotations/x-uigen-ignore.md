---
title: x-uigen-ignore
description: Exclude specific operations or entire resources from the generated UI.
---

# x-uigen-ignore

The `x-uigen-ignore` annotation allows you to exclude specific operations or entire resources from the generated UI. When an operation is marked with `x-uigen-ignore: true`, it is filtered out during IR construction and will not appear in any generated views, sidebar navigation, or dashboard widgets.

## Purpose

Use `x-uigen-ignore` when:

- You have internal or admin-only endpoints that should not appear in the public UI
- You want to hide deprecated endpoints while keeping them in the spec
- You have utility endpoints (health checks, metrics) that don't need UI representation
- You want to exclude specific operations from a resource without removing them from the spec

## How it works

`x-uigen-ignore` is a filtering mechanism that operates at the adapter layer, before operations reach the view hint classifier or relationship detector. Unlike `x-uigen-login` which classifies operations for special handling, `x-uigen-ignore` removes operations entirely from the IR.

When all operations for a resource are ignored, the entire resource is excluded from the IR.

## Supported values

`x-uigen-ignore` accepts **boolean values only**:

- `true`: exclude the operation from the generated UI
- `false`: include the operation explicitly (useful for overriding path-level annotations)

Non-boolean values (strings, numbers, objects, arrays, null) are treated as absent and a warning is logged.

## Supported locations

| Location | Effect |
|---|---|
| Operation | Excludes a single operation from the UI |
| Path item | Excludes all operations on that path (can be overridden per operation) |

## Precedence

When `x-uigen-ignore` appears at both path and operation levels, the operation-level annotation takes precedence:

```
Operation-level > Path-level
```

### Precedence examples

| Path annotation | Operation annotation | Result |
|---|---|---|
| `true` | `false` | Operation is **included** (override) |
| `false` | `true` | Operation is **excluded** (override) |
| `true` | (absent) | Operation is **excluded** (inherited) |
| `false` | (absent) | Operation is **included** (inherited) |
| (absent) | `true` | Operation is **excluded** |
| (absent) | `false` | Operation is **included** |
| (absent) | (absent) | Operation is **included** (default) |

## OpenAPI 3.x examples

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

