---
title: Component Mode
description: Replace an entire auto-generated view with your own React component.
---

# Component Mode

Component mode replaces the entire auto-generated view with your own React component. UIGen renders your component instead of the built-in view — you have full control over the UI.

## When to use

Use component mode when:

- The built-in view doesn't fit your design requirements
- You need a completely custom layout or interaction pattern
- You want to use a third-party component library for a specific view

## Example

```typescript
import { overrideRegistry, type OverrideDefinition } from '@uigen-dev/react';
import type { Resource, Operation } from '@uigen-dev/core';

interface MyUserTableProps {
  resource: Resource;
  operation: Operation;
}

function MyUserTable({ resource, operation }: MyUserTableProps) {
  return (
    <div>
      <h1>Custom User Table</h1>
      {/* Your custom implementation */}
    </div>
  );
}

const definition: OverrideDefinition = {
  id: 'users.list',
  mode: 'component',
  component: MyUserTable,
};

overrideRegistry.register(definition);
```

## Props

Your component receives the following props:

| Prop | Type | Description |
|---|---|---|
| `resource` | `Resource` | The IR resource object |
| `operation` | `Operation` | The IR operation object |

## Registration

Call `overrideRegistry.register()` before the UIGen app mounts. Typically this is done in your app's entry point, before rendering the `<UIGenApp />` component.

## Multiple overrides

You can register overrides for multiple views:

```typescript
overrideRegistry.register({ id: 'users.list', mode: 'component', component: MyUserTable });
overrideRegistry.register({ id: 'users.detail', mode: 'component', component: MyUserDetail });
overrideRegistry.register({ id: 'products.create', mode: 'component', component: MyProductForm });
```
