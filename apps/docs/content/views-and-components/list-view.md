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
- **Charts**: when the list response schema has `x-uigen-chart`, a chart renders above the table

## Charts

List View can render a chart above the table when the list response schema includes [`x-uigen-chart`](/docs/spec-annotations/x-uigen-chart) configuration.

The chart uses the same list operation as the table. UIGen:

1. Resolves `chartConfig` from the resource or list response schema
2. Fetches data with chart-specific query params (such as a higher `limit`)
3. Sorts time-series data and downsamples large datasets for rendering
4. Shows a "Showing X of Y points" note when sampling reduces the point count
5. Renders chart filter controls when `filters` are configured (`ref`, `datetime-range`, `select`, `number`)

Chart filter changes refetch list data for both the chart and the table. Chart fetch limits are independent from table pagination. When `query.limit` is set on the chart config, it overrides the table page size for the shared list request.

### Example

```yaml
paths:
  /api/v1/readings:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Reading'
                x-uigen-chart:
                  chartType: line
                  xAxis: recorded_at
                  yAxis: value
                  query:
                    limit: 500
                  sampling:
                    strategy: auto
                    maxPoints: 120
```

See [x-uigen-chart](/docs/spec-annotations/x-uigen-chart) for the full annotation reference.

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
