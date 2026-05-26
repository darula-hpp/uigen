---
title: Detail View
description: Read-only record page generated from GET single-resource endpoints.
---

# Detail View

The Detail View is generated for `GET /resources/{id}` endpoints. It renders a read-only page showing all fields of a single record.

## Features

- **Field rendering**: all fields from the response schema are displayed with appropriate formatting
- **Related resource links**: `hasMany` links to related resources (hidden when the same collection is embedded as a live stream below)
- **Embedded child stream**: nested list GET under the detail path, with optional WebSocket live updates (`DetailChildStreamPanel`)
- **Detail WebSocket**: when `x-uigen-websocket` is on the detail GET, the record fields update live in place
- **Action buttons**: POST actions (e.g. Take Reading) show a one-shot result panel; they are not the same as the live stream
- **Edit button**: links to the Edit Form View if a `PUT`/`PATCH` endpoint exists
- **Delete button**: triggers the delete confirmation dialog if a `DELETE` endpoint exists

## Embedded child stream

When a nested list GET exists under the detail path (or `x-uigen-detail-stream` names one explicitly), UIGen renders `DetailChildStreamPanel`:

| Child list config | Detail UI |
|---|---|
| `x-uigen-chart` on list response schema | Chart above the detail fields (history / telemetry) |
| `x-uigen-websocket` on list GET | Chart or highlighted row updates without polling |
| Neither chart nor WS | REST load only; latest row highlighted when schema has a date-time field |

The duplicate **hasMany** sidebar link for that same nested collection is hidden so you do not get both an inline stream and a redundant link.

### Explicit stream selection

```yaml
annotations:
  GET:/api/v1/sensors/{sensor_id}:
    x-uigen-detail-stream:
      operationId: list_sensor_readings
```

See [`x-uigen-detail-stream`](/docs/spec-annotations/x-uigen-detail-stream).

## Actions vs live stream

- **Live stream**: child list GET (+ optional `x-uigen-websocket`) merged into React Query; chart or latest row
- **Action (POST)**: e.g. Take Reading; shows `ActionResultPanel` with the POST response once; does not replace the stream

## Field formatting

Fields are formatted based on their type and format:

| Type / Format | Display |
|---|---|
| `string` | Plain text |
| `string` / `date` | Formatted date |
| `string` / `email` | Clickable `mailto:` link |
| `string` / `uri` | Clickable external link |
| `boolean` | Yes / No badge |
| `array` | Comma-separated list or nested table |
| `object` | Nested key-value section |

## Example spec

```yaml
paths:
  /pets/{petId}:
    get:
      summary: Get a pet by ID
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
```

## Customisation

Replace the Detail View for a specific resource:

```typescript
overrideRegistry.register({
  id: 'pets.detail',
  mode: 'component',
  component: MyCustomPetDetail,
});
```
