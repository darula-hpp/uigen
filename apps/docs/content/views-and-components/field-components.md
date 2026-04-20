---
title: Field Components
description: The input and display components used in forms and detail views.
---

# Field Components

Field components are the building blocks of forms and detail views. UIGen selects the appropriate component for each field based on its `FieldType` and optional `format`.

## Field types

| `FieldType` | Form component | Display component |
|---|---|---|
| `string` | Text input | Plain text |
| `string` + `format: email` | Email input | `mailto:` link |
| `string` + `format: uri` | URL input | External link |
| `string` + `format: date` | Date picker | Formatted date |
| `number` / `integer` | Number input | Formatted number |
| `boolean` | Checkbox | Yes / No badge |
| `enum` | Select dropdown | Badge |
| `array` | Repeatable field group | Comma-separated list |
| `object` | Nested field group | Key-value section |
| `file` | File upload with drag-and-drop | File name + download link |

## UI hints

You can override the default component selection using the `uiHint.widget` field in the IR, or via the `x-uigen-widget` annotation (planned, see [Planned Annotations](/docs/spec-annotations/planned-annotations)):

| Widget hint | Component |
|---|---|
| `textarea` | Multi-line text area |
| `select` | Select dropdown (for string fields) |
| `radio` | Radio button group |
| `checkbox` | Checkbox (for boolean fields) |
| `date` | Date picker |
| `file` | File upload |
| `color` | Color picker |

## Validation display

Validation errors are displayed inline below each field. The error message comes from the `ValidationRule.message` if provided, otherwise a default message is generated from the rule type.

## File uploads

File upload fields (`type: string`, `format: binary`) support drag-and-drop, file type validation, and size limits.

### Basic file upload

```yaml
components:
  schemas:
    Document:
      type: object
      properties:
        file:
          type: string
          format: binary
```

This generates a file upload component with:
- Drag-and-drop zone
- Click to browse files
- File preview after selection
- Remove file button

### File type restrictions

Use `x-uigen-file-types` to restrict allowed MIME types:

```yaml
avatar:
  type: string
  format: binary
  x-uigen-file-types:
    - image/jpeg
    - image/png
    - image/webp
```

### File size limits

Use `x-uigen-max-file-size` to set maximum file size in bytes:

```yaml
video:
  type: string
  format: binary
  x-uigen-max-file-size: 104857600  # 100MB
```

### Multiple file uploads

Use an array for multiple file uploads:

```yaml
attachments:
  type: array
  items:
    type: string
    format: binary
    x-uigen-file-types:
      - application/pdf
      - image/*
    x-uigen-max-file-size: 5242880  # 5MB per file
```

See [File Upload Metadata](/docs/spec-annotations/x-uigen-file-metadata) for complete documentation.

## Validation display

Validation errors are displayed inline below each field. The error message comes from the `ValidationRule.message` if provided, otherwise a default message is generated from the rule type.

## Customisation

Individual field components can be replaced using the Override System. See [Override System](/docs/override-system/overview) for details.
