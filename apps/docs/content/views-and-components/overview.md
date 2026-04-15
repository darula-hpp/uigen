---
title: Views & Components Overview
description: The UI patterns UIGen generates from your API spec.
---

# Views & Components

UIGen generates a set of UI patterns — called views — from the operations in your spec. Each view is selected automatically based on the HTTP method, path shape, and request/response schema.

## View types

| View | Trigger | Description |
|---|---|---|
| [List View](/docs/views-and-components/list-view) | `GET /resources` | Paginated, sortable table |
| [Detail View](/docs/views-and-components/detail-view) | `GET /resources/{id}` | Read-only record page |
| [Form View](/docs/views-and-components/form-view) | `POST /resources` | Create form |
| [Edit Form View](/docs/views-and-components/edit-form-view) | `PUT`/`PATCH /resources/{id}` | Pre-populated edit form |
| [Search View](/docs/views-and-components/search-view) | `GET` with query params | Filtered search |
| [Dashboard View](/docs/views-and-components/dashboard-view) | Auto-generated | Overview with resource counts |
| [Wizard View](/docs/views-and-components/wizard-view) | `POST` with large/nested body | Multi-step form |
| [Login View](/docs/views-and-components/login-view) | `x-uigen-login` annotation | Credential-based login form |

## View selection

The adapter assigns a `viewHint` to each operation. The React renderer uses this hint to select the appropriate view component. You can inspect the assigned hints in `ir.resources[n].operations[n].viewHint`.

## Field components

Every view uses a set of field components to render individual form inputs and display values. See [Field Components](/docs/views-and-components/field-components) for the full list.

## Customisation

All views can be replaced or augmented using the [Override System](/docs/override-system/overview). You can swap out an entire view, replace just the render output, or add side effects without changing the built-in rendering.
