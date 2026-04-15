---
title: Use Hooks Mode
description: Add side effects to a view without changing the built-in rendering.
---

# Use Hooks Mode

Use hooks mode lets you add side effects to a view without replacing the built-in rendering. UIGen renders the view as normal (your hook runs alongside it).

## When to use

Use hooks mode when:

- You want to track analytics events when a view is visited
- You need to update `document.title` based on the current resource
- You want to trigger a side effect (e.g. refresh a badge count) when a view loads
- You need to integrate with an external system without changing the UI

## Important

The built-in view **still renders** in hooks mode. You are not replacing anything (you are adding behaviour alongside the existing view).

## Example: analytics tracking

```typescript
import { overrideRegistry } from '@uigen-dev/react';
import { useEffect } from 'react';

overrideRegistry.register({
  id: 'users.list',
  mode: 'useHooks',
  useHooks({ resource }) {
    useEffect(() => {
      // Track page view in your analytics system
      analytics.track('view_resource_list', {
        resource: resource.slug,
      });
    }, [resource.slug]);
  },
});
```

## Example: document title

```typescript
import { overrideRegistry } from '@uigen-dev/react';
import { useEffect } from 'react';

overrideRegistry.register({
  id: 'users.detail',
  mode: 'useHooks',
  useHooks({ resource }) {
    useEffect(() => {
      document.title = `${resource.name} - My App`;
      return () => {
        document.title = 'My App';
      };
    }, [resource.name]);
  },
});
```

## Hook props

The `useHooks` function receives:

| Prop | Type | Description |
|---|---|---|
| `resource` | `Resource` | The IR resource object |
| `operation` | `Operation` | The IR operation object |

## Rules

- You can use any React hooks inside `useHooks`
- Do not return JSX (the return value is ignored)
- The hook runs on every render of the view, following normal React rules
