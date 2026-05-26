---
title: x-uigen-detail-stream
description: Pin a nested list stream to embed on a detail view.
---

# x-uigen-detail-stream

Use `x-uigen-detail-stream` on a **detail GET** operation when path-prefix heuristics are not enough to pick the child list to embed (unusual URL layouts, multiple nested collections, or explicit product intent).

## Purpose

- Select which nested list GET powers `DetailChildStreamPanel`
- Pair with `x-uigen-websocket` on that list GET for live updates
- Pair with `x-uigen-chart` on the list response schema for a chart on detail

Without this annotation, UIGen discovers a nested list by path prefix under the detail path and array `200` responses.

## Config example

```yaml
annotations:
  GET:/api/v1/sensors/{sensor_id}:
    x-uigen-detail-stream:
      operationId: list_sensor_readings
```

`operationId` must match the OpenAPI `operationId` of the nested list GET.

## Related annotations

| Annotation | Role on detail |
|---|---|
| `x-uigen-detail-stream` | Which child list to embed |
| `x-uigen-websocket` (on child list GET) | Live stream into the same cache as REST |
| `x-uigen-chart` (on child list schema) | Line chart instead of a single highlighted row |
| POST action on child path (e.g. Take Reading) | One-shot result panel, separate from the stream |
