---
title: x-uigen-label
description: Override the display label for a field, operation, or resource.
---

# x-uigen-label

The `x-uigen-label` annotation overrides the display label that UIGen generates for a field, operation, or resource. By default, UIGen derives labels from property names and operation summaries using title-case conversion.

## Purpose

Use `x-uigen-label` when:

- The property name is a technical identifier (e.g. `usr_id`, `created_at`)
- You want a more user-friendly label than the auto-generated one
- You need to localise labels without changing the spec's property names

## Supported locations

| Location | Effect |
|---|---|
| Schema property | Overrides the field label in forms and tables |
| Schema object | Overrides the resource name in the sidebar and headings |
| Operation | Overrides the operation label in action buttons and page titles |
| Path item | Overrides the label for all operations on that path |

## Precedence

When `x-uigen-label` appears at multiple levels, the most specific wins:

```
Operation > Path item > Schema property > Schema object
```

## OpenAPI 3.x examples

### Field label

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        usr_id:
          type: integer
          x-uigen-label: User ID
        created_at:
          type: string
          format: date
          x-uigen-label: Created
```

### Resource label

```yaml
components:
  schemas:
    usr:
      type: object
      x-uigen-label: User
      properties:
        id:
          type: integer
```

### Operation label

```yaml
paths:
  /users/{id}/activate:
    post:
      summary: activate_user
      x-uigen-label: Activate User
```

## Swagger 2.0 examples

### Field label

```yaml
definitions:
  User:
    type: object
    properties:
      usr_id:
        type: integer
        x-uigen-label: User ID
```

### Operation label

```yaml
paths:
  /users/{id}/activate:
    post:
      summary: activate_user
      x-uigen-label: Activate User
```

## Default label generation

Without `x-uigen-label`, UIGen generates labels by:

1. Splitting the property name on `_`, `-`, and camelCase boundaries
2. Title-casing each word
3. Joining with spaces

For example: `created_at` → `Created At`, `firstName` → `First Name`.
