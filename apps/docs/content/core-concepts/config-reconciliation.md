---
title: Config Reconciliation
description: Runtime merging of user config annotations into OpenAPI specs
order: 4
---

# Config Reconciliation

The Config Reconciliation System enables runtime merging of user-defined annotation overrides from `.uigen/config.yaml` into your OpenAPI/Swagger specifications without modifying source files.

## Why Config Reconciliation?

When using UIGen, you might want to customize how your API is rendered without modifying your original OpenAPI spec. Common scenarios include:

- Hiding internal endpoints from the UI (`x-uigen-ignore`)
- Marking authentication endpoints (`x-uigen-login`)
- Customizing field labels (`x-uigen-label`)
- Overriding spec annotations for different environments

The config reconciliation system lets you define these overrides in a separate config file that takes precedence over your spec annotations.

## Core Principles

### Non-Destructive
Your source spec file remains unchanged on disk. All reconciliation happens in memory at runtime.

### Config Takes Precedence
When an annotation exists in both your spec and config file, the config value wins.

### Idempotent
Applying reconciliation twice produces the same result as applying it once.

### Deterministic
Same input always produces the same output.

## Config File Structure

Create a `.uigen/config.yaml` file in your project root:

```yaml
version: "1.0"
enabled:
  x-uigen-ignore: true
  x-uigen-login: true
  x-uigen-label: true
defaults:
  x-uigen-ignore:
    value: false
annotations:
  # Hide an endpoint
  POST:/api/v1/internal/debug:
    x-uigen-ignore: true
  
  # Mark login endpoint
  POST:/auth/login:
    x-uigen-login: true
  
  # Customize field labels
  User.email:
    x-uigen-label: "Email Address"
  User.created_at:
    x-uigen-label: "Registration Date"
  
  # Nested properties
  User.address.street:
    x-uigen-label: "Street Address"
```

## Element Path Syntax

Element paths identify where annotations should be applied:

### Operations

Format: `METHOD:/path/to/endpoint`

Examples:
- `POST:/api/v1/users`
- `GET:/users/{id}`
- `DELETE:/items/{itemId}`
- `PATCH:/orders/{orderId}/status`

Supported methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD

### Schema Properties

Format: `SchemaName.propertyName`

Examples:
- `User.email` - top-level property
- `Product.price` - top-level property
- `User.address.street` - nested property
- `Order.items.quantity` - nested property

The reconciler automatically resolves `$ref` references.

## How It Works

When you run `uigen serve`, the reconciliation process:

1. **Loads Config**: Checks for `.uigen/config.yaml` in your project root
2. **Deep Clones Spec**: Creates an in-memory copy of your source spec
3. **Resolves Paths**: Locates each element path in the spec
4. **Merges Annotations**: Applies config annotations (config takes precedence)
5. **Validates**: Ensures the reconciled spec is valid OpenAPI/Swagger
6. **Generates UI**: Uses the reconciled spec for IR generation

Your source spec file is never modified.

## Generic Annotation Support

The reconciler treats **all** `x-uigen-*` annotations generically. This means:

- New annotations work automatically without code changes
- No hardcoded annotation names
- Future annotations are supported out of the box

### File Upload Configuration

Configure file upload restrictions using `x-uigen-file-types` and `x-uigen-max-file-size`:

```yaml
annotations:
  User.avatar:
    x-uigen-file-types:
      - image/jpeg
      - image/png
      - image/webp
    x-uigen-max-file-size: 5242880  # 5MB in bytes
  
  Document.attachment:
    x-uigen-file-types:
      - application/pdf
      - application/msword
      - application/vnd.openxmlformats-officedocument.wordprocessingml.document
    x-uigen-max-file-size: 10485760  # 10MB in bytes
  
  Media.video:
    x-uigen-file-types:
      - video/*  # Accept all video types
    x-uigen-max-file-size: 104857600  # 100MB in bytes
```

**Array Syntax**: `x-uigen-file-types` accepts an array of MIME types. You can use:
- Specific types: `image/jpeg`, `application/pdf`
- Wildcards: `image/*`, `video/*`, `*/*`
- Multiple types: Mix and match as needed

**File Size**: `x-uigen-max-file-size` accepts a number in bytes:
- 1MB = 1048576 bytes
- 5MB = 5242880 bytes
- 10MB = 10485760 bytes
- 100MB = 104857600 bytes

### Custom Annotations

Even if you create custom annotations, the reconciler will apply them correctly:

```yaml
annotations:
  User.profile:
    x-uigen-widget: "rich-text-editor"
    x-uigen-custom-validation: "email-domain-check"
```

## Relationship Configuration

UIGen can automatically detect relationships between resources based on API path patterns, but you can also explicitly configure relationships for better control and clarity.

### Declaring Relationships

Add relationships to your config file:

```yaml
relationships:
  - source: users
    target: orders
    path: /users/{id}/orders
    type: hasMany
    label: User Orders
    description: All orders placed by this user
  
  - source: orders
    target: users
    path: /users/{id}/orders
    type: belongsTo
    label: Order Owner
  
  - source: projects
    target: tags
    path: /projects/{id}/tags
    type: manyToMany
    label: Project Tags
```

### Relationship Types

Three relationship types are supported:

**`hasMany`** - One-to-many relationship
- Pattern: `/{source}/{id}/{target}`
- Example: A user has many orders
- Path: `/users/{id}/orders`

**`belongsTo`** - Many-to-one relationship  
- Pattern: `/{target}/{id}/{source}`
- Example: An order belongs to a user
- Path: `/users/{id}/orders` (from order's perspective)

**`manyToMany`** - Many-to-many relationship
- Detected when symmetric relationships exist
- Example: Projects and tags
- Paths: `/projects/{id}/tags` and `/tags/{id}/projects`

### Explicit vs. Derived Types

**Explicit types** (recommended):
```yaml
relationships:
  - source: users
    target: orders
    path: /users/{id}/orders
    type: hasMany  # Explicitly specified
```

**Derived types** (backward compatible):
```yaml
relationships:
  - source: users
    target: orders
    path: /users/{id}/orders
    # Type derived from path pattern
```

When the `type` field is present, it takes precedence over automatic derivation. If omitted, UIGen derives the type from the path pattern for backward compatibility.

### Migration Tool

If you have existing relationships without explicit types, use the config-gui migration tool:

1. Open the config-gui in your browser
2. Navigate to the Relationships tab
3. Click "Migrate Now" in the banner
4. All relationships will be updated with explicit types

The migration preserves all existing relationship fields and only adds the `type` field.

## Removing Annotations

Set an annotation to `null` to remove it from the reconciled spec:

```yaml
annotations:
  POST:/api/v1/users:
    x-uigen-ignore: null  # Remove this annotation
```

This is different from setting it to `false`:

```yaml
annotations:
  POST:/api/v1/users:
    x-uigen-ignore: false  # Set to false (not removed)
```

## Error Handling

### Missing Config File
If `.uigen/config.yaml` doesn't exist, UIGen uses your source spec without reconciliation. No errors.

### Invalid Element Path
If an element path doesn't match any spec element:
- Warning logged with suggestions
- Annotation skipped
- Reconciliation continues

Example:
```
Warning: Element path not found: POST:/api/v1/userz
Did you mean: POST:/api/v1/users?
```

### Validation Failure
If the reconciled spec is invalid:
- Error logged with details
- Server exits (won't serve invalid spec)

### Malformed Config
If the config file has syntax errors:
- Error logged
- Server exits with non-zero status

## Integration with Config GUI

The config-gui (visual annotation editor) automatically saves to `.uigen/config.yaml`. When you:

1. Open the config-gui in your browser
2. Toggle annotations on/off
3. Save your changes

The config file is updated, and on next server restart, your changes are applied via reconciliation.

## Example Workflow

1. Start with your OpenAPI spec:

```yaml
# openapi.yaml
paths:
  /api/v1/users:
    post:
      summary: Create user
      # No x-uigen annotations yet
```

2. Create config file:

```yaml
# .uigen/config.yaml
version: "1.0"
enabled:
  x-uigen-ignore: true
annotations:
  POST:/api/v1/users:
    x-uigen-ignore: true
```

3. Run UIGen:

```bash
npx @uigen-dev/cli serve openapi.yaml
```

4. The reconciled spec (in memory) now has:

```yaml
paths:
  /api/v1/users:
    post:
      summary: Create user
      x-uigen-ignore: true  # Applied from config
```

5. The UI won't show the `/api/v1/users` endpoint because it's ignored.

## Advanced: Precedence Rules

When the same annotation exists in multiple places:

1. **Config file** (highest precedence)
2. **Spec file**
3. **Default value** (lowest precedence)

Example:

```yaml
# Spec has:
User.email:
  x-uigen-label: "Email"

# Config has:
annotations:
  User.email:
    x-uigen-label: "Email Address"

# Result: "Email Address" (config wins)
```

## Testing

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

## Troubleshooting

### Config not applied

Check:
1. Config file is named `.uigen/config.yaml` (not `config.yml`)
2. Config file is in your project root
3. Element paths match your spec exactly
4. Server was restarted after config changes

### Element path not found

Check:
1. HTTP method is uppercase: `POST:/users` not `post:/users`
2. Path matches exactly: `/users/{id}` not `/users/:id`
3. Schema name matches exactly: `User.email` not `user.email`

### Validation errors

Check:
1. Config file has valid YAML syntax
2. Required fields present: `version`, `enabled`, `defaults`, `annotations`
3. Annotation values are valid for their type

## See Also

- [Spec Annotations](/docs/spec-annotations/overview) - Available `x-uigen-*` annotations
- [How It Works](/docs/core-concepts/how-it-works) - UIGen architecture overview
- [CLI Reference](/docs/cli-reference/serve) - `serve` command options
