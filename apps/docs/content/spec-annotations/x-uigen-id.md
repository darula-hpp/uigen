---
title: x-uigen-id
description: Override the stable identifier used for the Override System.
---

# x-uigen-id

The `x-uigen-id` annotation overrides the stable identifier (`uigenId`) that UIGen assigns to a resource or operation. This identifier is used by the [Override System](/docs/override-system/overview) to target specific views for replacement.

## Purpose

By default, UIGen generates `uigenId` values from the resource slug and operation method. These IDs can change if you rename resources or restructure your spec. Use `x-uigen-id` to pin a stable identifier that won't change even if the spec evolves.

## Default ID generation

Without `x-uigen-id`, UIGen generates IDs using the pattern:

```
{resourceSlug}.{viewHint}
```

For example:
- `GET /users` → `users.list`
- `POST /users` → `users.create`
- `GET /users/{id}` → `users.detail`

## Fallback to slug

If `x-uigen-id` is not set, UIGen falls back to the auto-generated slug. The slug is derived from the path by stripping path parameters and joining segments with dots.

## OpenAPI 3.x example

```yaml
paths:
  /users:
    get:
      summary: List users
      x-uigen-id: user-list
    post:
      summary: Create user
      x-uigen-id: user-create
  /users/{id}:
    get:
      summary: Get user
      x-uigen-id: user-detail
```

With these annotations, the Override System targets use the pinned IDs:

```typescript
overrideRegistry.register({
  id: 'user-list',
  mode: 'component',
  component: MyUserTable,
});
```

## Swagger 2.0 example

```yaml
paths:
  /users:
    get:
      summary: List users
      x-uigen-id: user-list
```

## Uniqueness

`x-uigen-id` values must be unique across all operations in the spec. If two operations share the same `x-uigen-id`, UIGen logs a warning and uses the auto-generated ID for the conflicting operation.
