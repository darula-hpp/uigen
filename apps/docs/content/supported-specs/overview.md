---
title: Supported Specs
description: API specification formats and versions supported by UIGen.
---

# Supported Specs

UIGen supports the two most widely used API specification formats.

## OpenAPI 3.x

OpenAPI 3.0 and 3.1 are the primary supported formats. All features are available:

- Full `$ref` resolution including circular references
- `components/schemas`, `components/securitySchemes`, `components/parameters`
- `servers` array for environment switching
- `requestBody` with `content` type negotiation
- `allOf`, `oneOf`, `anyOf` schema composition (flattened to a single `SchemaNode`)
- All standard security scheme types: `http` (bearer, basic), `apiKey`, `oauth2`

## Swagger 2.0

Swagger 2.0 (formerly OpenAPI 2.0) is fully supported. The adapter normalises Swagger 2.0 constructs to the same IR:

- `definitions` → schema resolution
- `basePath` + `host` + `schemes` → server URL
- `securityDefinitions` → auth schemes
- `produces` / `consumes` → content type handling
- `formData` parameters → request body schema

## Format detection

UIGen auto-detects the spec format from the document's root keys:

- `openapi: "3.x.x"` → OpenAPI 3.x adapter
- `swagger: "2.0"` → Swagger 2.0 adapter

Both YAML and JSON are accepted.

## Planned support

- **OpenAPI 3.1** — full support is in progress. Most 3.1 documents work today; edge cases around JSON Schema vocabulary differences are being addressed.
- **GraphQL** — planned for a future release.

## Compatibility notes

UIGen aims to work with real-world specs, which are often imperfect. If your spec has issues, check `ir.parsingErrors` for details. See [Adapters](/docs/core-concepts/adapters) for how UIGen handles malformed or incomplete specs.
