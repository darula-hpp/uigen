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
| `file` | File upload input | File name + download link |

## UI hints

You can override the default component selection using the `uiHint.widget` field in the IR, or via the `x-uigen-widget` annotation (planned — see [Planned Annotations](/docs/spec-annotations/planned-annotations)):

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

## Customisation

Individual field components can be replaced using the Override System. See [Override System](/docs/override-system/overview) for details.
