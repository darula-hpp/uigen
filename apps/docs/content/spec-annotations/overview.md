---
title: Spec Annotations Overview
description: x-uigen-* vendor extensions for customising the generated UI from your spec.
---

# Spec Annotations

UIGen supports a set of `x-uigen-*` vendor extensions that let you customise the generated UI directly from your OpenAPI or Swagger spec. These annotations are optional (UIGen works without them) but they give you fine-grained control over labels, identifiers, and behaviour.

## Available annotations

| Annotation | Purpose | Status |
|---|---|---|
| [`x-uigen-label`](/docs/spec-annotations/x-uigen-label) | Override the display label for a field, operation, or resource | Available |
| [`x-uigen-id`](/docs/spec-annotations/x-uigen-id) | Override the stable identifier used for overrides | Available |
| [`x-uigen-ignore`](/docs/spec-annotations/x-uigen-ignore) | Exclude specific operations or entire resources from the generated UI | Available |
| [`x-uigen-login`](/docs/authentication/credential-login) | Mark an endpoint as the credential login endpoint | Available |
| [`x-uigen-token-path`](/docs/authentication/credential-login) | Dot-notation path to the token in a login response | Available |
| [`x-uigen-widget`](/docs/spec-annotations/planned-annotations) | Override the field input component | Coming Soon |
| [`x-uigen-hidden`](/docs/spec-annotations/planned-annotations) | Hide a field from the generated UI | Coming Soon |
| [`x-uigen-order`](/docs/spec-annotations/planned-annotations) | Control field ordering in forms and tables | Coming Soon |

## Where annotations are supported

Annotations can be placed at different levels of the spec:

- **Schema property**: affects a single field
- **Schema object**: affects all fields in a schema
- **Path item**: affects all operations on a path
- **Operation**: affects a single operation

## Precedence

When the same annotation appears at multiple levels, the most specific level wins:

```
Operation > Path item > Schema property > Schema object
```

## Swagger 2.0 support

All `x-uigen-*` annotations work in Swagger 2.0 documents in the same way as OpenAPI 3.x.
