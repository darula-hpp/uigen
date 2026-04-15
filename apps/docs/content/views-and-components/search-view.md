---
title: Search View
description: Filtered search view generated from GET endpoints with query parameters.
---

# Search View

The Search View is generated for `GET` endpoints that define query parameters for filtering. It renders a search bar and filter controls above a results table.

## Features

- **Search bar** — a text input that maps to the primary search query parameter
- **Filter controls** — additional query parameters are rendered as filter inputs (dropdowns for enums, date pickers for date fields, etc.)
- **Live results** — results update as the user types or changes filters
- **Results table** — same table component as the List View, with sorting and pagination

## Query parameter detection

The adapter identifies search/filter parameters by their location (`in: query`) and names. Parameters named `q`, `query`, `search`, or `filter` are treated as the primary search input. All other query parameters become secondary filter controls.

## Example spec

```yaml
paths:
  /pets/search:
    get:
      summary: Search pets
      parameters:
        - name: q
          in: query
          schema:
            type: string
          description: Search query
        - name: status
          in: query
          schema:
            type: string
            enum: [available, pending, sold]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
```

This produces a search bar plus a status dropdown filter.

## Customisation

Replace the Search View for a specific resource:

```typescript
overrideRegistry.register({
  id: 'pets.search',
  mode: 'component',
  component: MyCustomPetSearch,
});
```
