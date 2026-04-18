---
title: x-uigen-ref
description: Declare that a field references another resource with full control over resolution and display.
---

# x-uigen-ref

The `x-uigen-ref` annotation explicitly declares that a schema field references another resource. It provides full control over how the relationship is resolved and displayed, overriding any auto-detected relationship heuristics.

## Purpose

Use `x-uigen-ref` when:

- A field stores a reference to another resource (e.g. `assigned_to` stores a user ID)
- You want forms to render a select/autocomplete widget instead of a plain text input
- You want list and detail views to display human-readable labels instead of raw IDs
- You need to override auto-detected relationships with explicit configuration

## Annotation shape

```yaml
x-uigen-ref:
  resource: /users                          # required - endpoint path
  valueField: id                            # required - stored value field
  labelField: "{first_name} {last_name}"    # required - plain field or template
  filter:                                   # optional - static query params
    active: true
```

## Field reference

| Field | Type | Required | Description |
|---|---|---|---|
| `resource` | `string` | yes | Endpoint path of the referenced resource (e.g. `/users`) |
| `valueField` | `string` | yes | Field name used as the stored value (e.g. `id`) |
| `labelField` | `string` | yes | Plain field name or template with `{field}` placeholders |
| `filter` | `object` | no | Static query parameters appended when fetching options |

## OpenAPI 3.x examples

### Basic reference

```yaml
components:
  schemas:
    Task:
      type: object
      properties:
        assigned_to:
          type: string
          x-uigen-ref:
            resource: /users
            valueField: id
            labelField: name
```

### Template label

```yaml
components:
  schemas:
    Order:
      type: object
      properties:
        customer_id:
          type: string
          x-uigen-ref:
            resource: /customers
            valueField: id
            labelField: "{first_name} {last_name}"
```

### With filter

```yaml
components:
  schemas:
    Project:
      type: object
      properties:
        manager_id:
          type: string
          x-uigen-ref:
            resource: /users
            valueField: id
            labelField: name
            filter:
              role: manager
              active: true
```

## Swagger 2.0 examples

### Basic reference

```yaml
definitions:
  Task:
    type: object
    properties:
      assigned_to:
        type: string
        x-uigen-ref:
          resource: /users
          valueField: id
          labelField: name
```

### Template label

```yaml
definitions:
  Order:
    type: object
    properties:
      customer_id:
        type: string
        x-uigen-ref:
          resource: /customers
          valueField: id
          labelField: "{first_name} {last_name}"
```

## Behavior

### Forms

When a field has `x-uigen-ref`, UIGen renders it as a select or autocomplete widget:

1. Fetches options from the `resource` endpoint
2. Appends `filter` parameters as query params (if provided)
3. Maps each record to an option where:
   - Value = `record[valueField]`
   - Label = resolved `labelField` template
4. On form submit, sends the `valueField` value (not the display label)

### List views

In list views, UIGen resolves and displays the label for each row:

1. Fetches records from the `resource` endpoint
2. Matches each stored value against `valueField`
3. Displays the resolved `labelField` template for matching records
4. Falls back to the raw stored value if no match is found

### Detail views

In detail views, UIGen resolves and displays the label:

1. Fetches the referenced record from the `resource` endpoint
2. Displays the resolved `labelField` template
3. Falls back to the raw stored value if the fetch fails

## Graceful degradation

When the referenced resource cannot be fetched (network error, 4xx, 5xx):

- **Forms**: fall back to a plain text input
- **List/Detail views**: display the raw stored value
- **Dev mode**: emit a `console.warn` with the resource path and error reason

UIGen never crashes due to a failed `x-uigen-ref` fetch.

## Template syntax

The `labelField` supports two formats:

### Plain field

```yaml
labelField: name
```

Returns the value of the `name` field from the record.

### Template with placeholders

```yaml
labelField: "{first_name} {last_name}"
```

Replaces each `{fieldName}` placeholder with the corresponding field value from the record. Missing or null fields are replaced with empty strings.

Examples:
- `"{first_name} {last_name}"` → `"John Doe"`
- `"{code} - {description}"` → `"ABC - Product description"`
- `"User #{id}: {username}"` → `"User #123: johndoe"`

## Precedence over auto-detection

When `x-uigen-ref` is present on a field, UIGen does not apply auto-detected relationship heuristics (e.g. `*_id` field name patterns). The explicit annotation always wins.

Fields without `x-uigen-ref` continue to use auto-detection.
