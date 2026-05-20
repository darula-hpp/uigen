---
title: x-uigen-chart
description: Configure data visualization charts for list endpoints that return array data.
---

# x-uigen-chart

The `x-uigen-chart` annotation configures a chart above the table in List View. UIGen reads the annotation at compile time, stores a `chartConfig` on the response schema, fetches data through the list operation, and renders the chart with Recharts.

## Purpose

Use `x-uigen-chart` when:

- A list endpoint returns time-series or categorical numeric data
- You want a visual summary above the paginated table
- The API can return more rows than you want to draw on screen at once

## Supported locations

| Location | Effect |
|---|---|
| List response schema (OpenAPI) | Attaches chart config to the array response |
| Config reconciliation (`.uigen/config.yaml`) | Adds or overrides chart config on a JSON pointer path |

The annotation applies to **array response schemas** where items are objects. It cannot be applied to primitive arrays.

## Annotation shape

```yaml
x-uigen-chart:
  chartType: line
  xAxis: recorded_at
  yAxis: value
  series:                        # optional, auto-generated when yAxis is an array
    - field: revenue
      label: Revenue
      color: '#4CAF50'
  labels: category               # optional, pie/donut label field
  options:
    title: Sensor Telemetry
  query:                         # optional, chart-specific fetch params
    limit: 500
    params:
      sensor_id: sensor_id
  sampling:                      # optional, client-side downsampling
    strategy: auto
    maxPoints: 120
  filters:                       # optional schema, UI coming in a future release
    - param: sensor_id
      field: sensor_id
      type: ref
      resource: sensors
```

## Field reference

| Field | Type | Required | Description |
|---|---|---|---|
| `chartType` | `string` | yes | One of `line`, `bar`, `pie`, `scatter`, `area`, `radar`, `donut` |
| `xAxis` | `string` | yes | Item field used for the x-axis |
| `yAxis` | `string \| string[]` | yes | Item field(s) used for the y-axis |
| `series` | `object[]` | no | Per-series labels and colors. Auto-generated when `yAxis` is an array |
| `labels` | `string` | no | Label field for pie and donut charts |
| `options` | `object` | no | Display options such as `title`, legend, and axis labels |
| `query.limit` | `number` | no | Overrides the list fetch limit for chart data |
| `query.params` | `object` | no | Maps filter state keys to OpenAPI query parameter names |
| `sampling.strategy` | `string` | no | `auto`, `lttb`, `bucket-mean`, or `none`. Defaults to `auto` |
| `sampling.maxPoints` | `number` | no | Maximum points to render. Defaults to `120` |
| `filters` | `object[]` | no | Filter controls bound to query params (`ref`, `datetime-range`, `select`, `number`) |

## Chart types

| Type | Best for |
|---|---|
| `line` | Time-series and continuous trends |
| `area` | Time-series with filled regions |
| `bar` | Categorical comparisons |
| `pie` / `donut` | Part-to-whole relationships |
| `scatter` | Correlation between two numeric fields |
| `radar` | Multi-axis comparisons |

## OpenAPI 3.x example

```yaml
paths:
  /api/v1/readings:
    get:
      summary: List sensor readings
      parameters:
        - name: sensor_id
          in: query
          schema:
            type: integer
        - name: limit
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
                  options:
                    title: Sensor Telemetry
```

## Config reconciliation example

You can add chart config in `.uigen/config.yaml` without editing the OpenAPI spec:

```yaml
annotations:
  '#/paths/~1api~1v1~1readings/get/responses/200/content/application~1json/schema':
    x-uigen-chart:
      chartType: line
      xAxis: recorded_at
      yAxis: value
      query:
        limit: 500
        params:
          sensor_id: sensor_id
      sampling:
        strategy: auto
        maxPoints: 120
      options:
        title: Sensor Telemetry
```

## Query and sampling

Charts reuse the list operation but can fetch more rows than the table pagination default.

### Query

When `query.limit` is set, UIGen sends that value using the list operation's limit query parameter (`limit`, `pageSize`, or `page_size` when present). The table keeps its own pagination settings.

When `query.params` is set, UIGen maps filter state keys to OpenAPI query parameter names. This is useful for nested list routes or future chart filter controls.

### Sampling

Large datasets are downsampled on the client before rendering:

| Strategy | Behavior |
|---|---|
| `auto` | Uses LTTB for line and area charts, bucket-mean for bar charts |
| `lttb` | Largest-Triangle-Three-Buckets downsampling for line charts |
| `bucket-mean` | Averages values inside fixed buckets |
| `none` | Renders every fetched point |

When sampling reduces the point count, List View shows a note such as "Showing 120 of 500 points".

Time-series charts are sorted by the x-axis before sampling when the axis is detected as a time field.

## How it works in List View

1. `ChartHandler` validates the annotation and sets `chartConfig` on the response schema
2. `ListView` resolves chart config from the resource or list response schema
3. `ChartQueryResolver` builds chart-specific query params for the list fetch
4. `ChartDataPipeline` sorts, detects axis types, and samples the response rows
5. `ChartPanel` renders filter controls when `filters` are configured
6. `ChartVisualization` renders the prepared points with Recharts

The chart and table share the same list fetch. Chart filter changes refetch list data for both views. Chart query params are merged with table pagination params, except when `query.limit` is set (the chart limit takes precedence over the table page size).

## Filters

Chart filters render above the chart in List View and bind to OpenAPI query parameters on the list operation. Changing a filter refetches list data for both the chart and the table.

```yaml
filters:
  - param: sensor_id
    field: sensor_id
    type: ref
    resource: sensors
  - param: start_date
    field: recorded_at
    type: datetime-range
    presets: [last_24h, last_7d, last_30d]
    default: last_24h
```

Supported filter types:

| Type | UI control | Query behavior |
|---|---|---|
| `ref` | Select populated from another resource's list operation | Sends selected value to `param` |
| `datetime-range` | Preset range select | Resolves preset to start/end query params |
| `select` | Select populated from the list operation parameter enum | Sends selected value to `param` |
| `number` | Number input | Sends entered value to `param` |

For `datetime-range` filters, UIGen detects `start_date`/`end_date`, `start`/`end`, or `from`/`to` query parameter pairs from the list operation. Presets include `last_24h`, `last_7d`, `last_30d`, and `last_90d`.

For `ref` filters, `resource` is the slug of the related resource (for example `sensors`). UIGen loads options from that resource's list operation and uses `id` and `name` fields when present.

## Validation rules

- `chartType`, `xAxis`, and `yAxis` are required
- The annotation must target an array response schema with object items
- `query.limit` and `sampling.maxPoints` must be positive numbers
- Unknown chart types, sampling strategies, or filter types are rejected with warnings

## See also

- [List View](/docs/views-and-components/list-view) for how charts appear above tables
- [Config reconciliation](/docs/core-concepts/config-reconciliation) for adding annotations in `.uigen/config.yaml`
