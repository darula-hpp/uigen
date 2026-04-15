---
title: Override ID Addressing
description: The full addressing scheme for targeting views with the Override System.
---

# Override ID Addressing

Every view in UIGen has a stable `uigenId` that you use to target it with the Override System. This page documents the full addressing scheme.

## Default ID pattern

Auto-generated IDs follow the pattern:

```
{resourceSlug}.{viewHint}
```

## Full addressing table

| Pattern | View | Example |
|---|---|---|
| `{slug}.list` | List View | `users.list` |
| `{slug}.detail` | Detail View | `users.detail` |
| `{slug}.create` | Form View (create) | `users.create` |
| `{slug}.update` | Edit Form View | `users.update` |
| `{slug}.delete` | Delete confirmation | `users.delete` |
| `{slug}.search` | Search View | `users.search` |
| `{slug}.wizard` | Wizard View | `orders.wizard` |
| `{slug}.action.{operationId}` | Custom action | `users.action.activate` |
| `dashboard` | Dashboard View | `dashboard` |
| `auth.login` | Login View | `auth.login` |

## Resource slug derivation

The resource slug is derived from the path by:

1. Taking the first path segment after `/` (e.g. `/users/{id}` → `users`)
2. Lowercasing and replacing non-alphanumeric characters with `-`

For example:
- `/users` → `users`
- `/api/v1/users` → `users` (first meaningful segment)
- `/user-profiles` → `user-profiles`

## Custom IDs

Pin a custom ID using the [`x-uigen-id`](/docs/spec-annotations/x-uigen-id) annotation:

```yaml
paths:
  /users:
    get:
      x-uigen-id: user-list
```

Then target it in the Override System:

```typescript
overrideRegistry.register({
  id: 'user-list',
  mode: 'component',
  component: MyUserTable,
});
```

## Wildcard targeting

You can target all views for a resource using a wildcard (planned — not yet available):

```typescript
// Coming Soon
overrideRegistry.register({
  id: 'users.*',
  mode: 'useHooks',
  useHooks: myAnalyticsHook,
});
```

## Inspecting IDs

To see the `uigenId` for each view, inspect `ir.resources[n].operations[n].uigenId` in the browser console:

```javascript
console.log(window.__UIGEN_CONFIG__.resources.map(r => ({
  resource: r.slug,
  operations: r.operations.map(o => o.uigenId),
})));
```
