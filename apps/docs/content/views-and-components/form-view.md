---
title: Form View
description: Create form generated from POST endpoints.
---

# Form View

The Form View is generated for `POST /resources` endpoints. It renders a validated create form using React Hook Form and Zod.

## Features

- **Field generation**: form fields are derived from the `requestBody` schema
- **Validation**: constraints from the spec (`minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `required`) are enforced client-side via Zod
- **Field types**: each field renders the appropriate input component based on its type and format
- **Submit handling**: on success, navigates to the Detail View for the newly created record

## Validation mapping

| Spec constraint | Zod rule |
|---|---|
| `minLength` | `z.string().min(n)` |
| `maxLength` | `z.string().max(n)` |
| `pattern` | `z.string().regex(...)` |
| `minimum` | `z.number().min(n)` |
| `maximum` | `z.number().max(n)` |
| `required` (field) | `.min(1)` or non-optional |
| `format: email` | `z.string().email()` |
| `format: uri` | `z.string().url()` |

## Wizard threshold

If the `requestBody` schema has more than 8 fields, or contains nested objects, UIGen renders a [Wizard View](/docs/views-and-components/wizard-view) instead of a flat form.

## Example spec

```yaml
paths:
  /pets:
    post:
      summary: Create a pet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewPet'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
```

## Customisation

Replace the Form View for a specific resource:

```typescript
overrideRegistry.register({
  id: 'pets.create',
  mode: 'component',
  component: MyCustomPetForm,
});
```
