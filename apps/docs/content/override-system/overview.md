---
title: Override System Overview
description: Selectively replace or augment any auto-generated view in UIGen.
---

# Override System

> **In development**: the Override System is implemented and available in the current release, but the API may change in minor versions until it stabilises.

The Override System lets you selectively replace or augment any auto-generated view without touching the rest of the UI. Think of it like CSS selectors for components: you target a specific view by its ID and provide a replacement or enhancement.

## Mental model

Just as CSS lets you target a specific element and override its styles, the Override System lets you target a specific view by its `uigenId` and override its rendering. Everything else continues to work as generated.

## Three modes

| Mode | What it does |
|---|---|
| [`component`](/docs/override-system/component-mode) | Replaces the entire view with your own React component |
| [`render`](/docs/override-system/render-mode) | Replaces only the rendered output; UIGen still fetches data |
| [`useHooks`](/docs/override-system/use-hooks-mode) | Adds side effects without changing the built-in rendering |

## Priority order

When multiple overrides target the same view, the most specific wins:

```
component > render > useHooks
```

## Targeting views

Each view has a stable `uigenId` that you use to target it. The ID follows the pattern `{resourceSlug}.{viewHint}`:

```
users.list       → List View for the users resource
users.detail     → Detail View for the users resource
users.create     → Form View for the users resource
users.update     → Edit Form View for the users resource
dashboard        → Dashboard View
auth.login       → Login View
```

You can also pin custom IDs using the [`x-uigen-id`](/docs/spec-annotations/x-uigen-id) annotation.

See [Override ID Addressing](/docs/override-system/override-id-addressing) for the full addressing scheme.

## Registration

Overrides are registered before the app mounts:

```typescript
import { overrideRegistry } from '@uigen-dev/react';

overrideRegistry.register({
  id: 'users.list',
  mode: 'component',
  component: MyUserTable,
});
```
