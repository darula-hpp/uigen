---
title: Render Mode
description: Replace the rendered output while UIGen still fetches data.
---

# Render Mode

Render mode lets you replace only the rendered output of a view. UIGen still handles data fetching, loading states, and pagination (you just provide the JSX to render).

## When to use

Use render mode when:

- You want a custom layout but don't want to re-implement data fetching
- You need to change how data is displayed without changing the data source
- You want to keep UIGen's loading and error states but customise the success state

## Example

```typescript
import { overrideRegistry } from '@uigen-dev/react';

overrideRegistry.register({
  id: 'users.list',
  mode: 'render',
  render({ data, isLoading, pagination }) {
    if (isLoading) return <div>Loading users...</div>;

    return (
      <div>
        <ul>
          {data.map((user: { id: number; name: string }) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
        {pagination && (
          <div>
            <button onClick={pagination.prevPage} disabled={!pagination.hasPrev}>
              Previous
            </button>
            <button onClick={pagination.nextPage} disabled={!pagination.hasNext}>
              Next
            </button>
          </div>
        )}
      </div>
    );
  },
});
```

## Render props

The `render` function receives:

| Prop | Type | Description |
|---|---|---|
| `data` | `unknown[]` | The fetched records |
| `isLoading` | `boolean` | True while the initial fetch is in progress |
| `isError` | `boolean` | True if the fetch failed |
| `error` | `Error \| null` | The fetch error, if any |
| `pagination` | `PaginationControls \| null` | Pagination controls, if the operation is paginated |
| `resource` | `Resource` | The IR resource object |
| `operation` | `Operation` | The IR operation object |

## `PaginationControls`

```typescript
interface PaginationControls {
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
}
```

## Difference from component mode

| | Component mode | Render mode |
|---|---|---|
| Data fetching | Your responsibility | UIGen handles it |
| Loading state | Your responsibility | UIGen handles it |
| Pagination | Your responsibility | UIGen handles it |
| Rendered output | Full control | Full control |
