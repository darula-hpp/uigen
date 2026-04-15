---
title: Wizard View
description: Multi-step form generated for large or nested POST request bodies.
---

# Wizard View

The Wizard View is a multi-step form triggered automatically when a `POST` endpoint's request body has more than 8 fields, or contains nested objects. It groups fields into logical steps to reduce cognitive load.

## Trigger conditions

UIGen uses the Wizard View instead of the flat [Form View](/docs/views-and-components/form-view) when either condition is met:

- The `requestBody` schema has **more than 8 top-level fields**
- The `requestBody` schema contains **nested objects** (fields with `type: object`)

## Step grouping

Steps are grouped automatically:

1. **Required fields** — all required fields appear in the first step
2. **Optional fields** — optional fields are grouped into subsequent steps by object nesting
3. **Review** — a final read-only review step shows all entered values before submission

## Features

- **Progress indicator** — shows the current step and total steps
- **Back / Next navigation** — users can move between steps; earlier steps are validated before advancing
- **Per-step validation** — only the fields in the current step are validated on Next
- **Review step** — shows a summary of all entered values before final submission

## Example spec

A `POST /orders` endpoint with a nested `shippingAddress` object and more than 8 fields will automatically render as a wizard.

```yaml
components:
  schemas:
    NewOrder:
      type: object
      required: [customerId, items]
      properties:
        customerId:
          type: integer
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
        shippingAddress:
          type: object
          properties:
            street:
              type: string
            city:
              type: string
            country:
              type: string
        notes:
          type: string
        # ... more fields
```

## Customisation

Replace the Wizard View for a specific resource:

```typescript
overrideRegistry.register({
  id: 'orders.create',
  mode: 'component',
  component: MyCustomOrderWizard,
});
```
