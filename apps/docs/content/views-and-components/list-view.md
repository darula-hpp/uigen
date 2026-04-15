---
title: List View
description: Paginated, sortable data table generated from GET collection endpoints.
---

# List View

The List View is generated for `GET /resources` endpoints (collection endpoints that return an array of records). It renders a full-featured data table using TanStack Table.

## Features

- **Sorting**: click any column header to sort ascending or descending
- **Pagination**: automatic offset, cursor, or page-based pagination detected from query parameters
- **Row actions**: Edit and Delete buttons on each row, linked to the corresponding edit form and delete confirmation
- **Navigation**: clicking a row opens the Detail View for that record
- **Column generation**: columns are derived from the response schema's top-level fields

## Pagination detection

The adapter detects the pagination strategy from the query parameters defined in the spec:

| Strategy | Detected params |
|---|---|
| Offset | `limit` + `offset` |
| Page | `page` + `per_page` (or `pageSize`) |
| Cursor | `cursor` + `limit` |

If no pagination params are found, the table renders all returned records without pagination controls.

## Example spec

```yaml
paths:
  /pets:
    get:
      summary: List all pets
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
        - name: offset
          in: query
          schema:
            type: integer
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
```

This produces a paginated table with offset-based pagination controls.

## Customisation

Replace the entire List View for a specific resource using the [Override System](/docs/override-system/component-mode):

```typescript
overrideRegistry.register({
  id: 'pets.list',
  mode: 'component',
  component: MyCustomPetTable,
});
```
