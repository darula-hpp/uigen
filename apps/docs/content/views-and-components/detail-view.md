---
title: Detail View
description: Read-only record page generated from GET single-resource endpoints.
---

# Detail View

The Detail View is generated for `GET /resources/{id}` endpoints. It renders a read-only page showing all fields of a single record.

## Features

- **Field rendering** — all fields from the response schema are displayed with appropriate formatting
- **Related resource links** — if the adapter detects relationships (e.g. `GET /users/{id}/orders`), links to related resources appear in the detail view
- **Edit button** — links to the Edit Form View if a `PUT`/`PATCH` endpoint exists for the resource
- **Delete button** — triggers the delete confirmation dialog if a `DELETE` endpoint exists

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
