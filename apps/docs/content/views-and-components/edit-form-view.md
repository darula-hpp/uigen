---
title: Edit Form View
description: Pre-populated edit form generated from PUT and PATCH endpoints.
---

# Edit Form View

The Edit Form View is generated for `PUT /resources/{id}` and `PATCH /resources/{id}` endpoints. It works like the [Form View](/docs/views-and-components/form-view) but pre-populates all fields with the current record's values.

## Features

- **Pre-population** — fetches the current record via the corresponding `GET /resources/{id}` endpoint and fills all form fields
- **Partial updates** — `PATCH` endpoints produce a form where all fields are optional by default
- **Validation** — same constraint mapping as the Form View
- **Cancel** — navigates back to the Detail View without saving

## Difference from Form View

| | Form View | Edit Form View |
|---|---|---|
| HTTP method | `POST` | `PUT` / `PATCH` |
| Initial values | Empty | Fetched from API |
| Required fields | Per spec | `PATCH`: all optional |

## Example spec

```yaml
paths:
  /pets/{petId}:
    put:
      summary: Update a pet
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
```

## Customisation

Replace the Edit Form View for a specific resource:

```typescript
overrideRegistry.register({
  id: 'pets.update',
  mode: 'component',
  component: MyCustomPetEditForm,
});
```
