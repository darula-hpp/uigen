---
title: Planned Annotations
description: x-uigen-* annotations that are coming in a future release.
---

# Planned Annotations

The following `x-uigen-*` annotations are planned for a future release. They are not yet available.

> **Coming Soon**: these annotations are not implemented yet. This page documents the intended behavior so you can plan ahead.

## `x-uigen-widget`

Override the input component used for a field in forms.

**Planned usage:**

```yaml
components:
  schemas:
    Post:
      type: object
      properties:
        body:
          type: string
          x-uigen-widget: textarea
        status:
          type: string
          enum: [draft, published]
          x-uigen-widget: radio
```

**Planned widget values:** `textarea`, `select`, `radio`, `checkbox`, `date`, `file`, `color`

## `x-uigen-hidden`

Hide a field from the generated UI entirely. The field is still sent in API requests if it has a default value.

**Planned usage:**

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        internal_id:
          type: string
          x-uigen-hidden: true
```

## `x-uigen-order`

Control the display order of fields in forms and table columns. Lower numbers appear first.

**Planned usage:**

```yaml
components:
  schemas:
    Product:
      type: object
      properties:
        name:
          type: string
          x-uigen-order: 1
        sku:
          type: string
          x-uigen-order: 2
        description:
          type: string
          x-uigen-order: 3
```

## Timeline

These annotations are part of Phase 3 of the UIGen roadmap. See the [Roadmap](/docs/roadmap/index) for the full plan.
