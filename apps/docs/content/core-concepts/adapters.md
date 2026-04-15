---
title: Adapters
description: How UIGen parses OpenAPI 3.x and Swagger 2.0 specs into the IR.
---

# Adapters

An adapter reads a raw spec string and produces the [Intermediate Representation (IR)](/docs/core-concepts/intermediate-representation). UIGen ships two adapters, selected automatically based on the spec's format.

## OpenAPI 3.x adapter

Handles OpenAPI 3.0 and 3.1 documents. This is the primary adapter and supports the full feature set.

The adapter processes:

- `paths` — each path/method combination becomes an `Operation` with a `viewHint`
- `components/schemas` — resolved and inlined into `SchemaNode` trees
- `components/securitySchemes` — mapped to `AuthScheme` entries in `AuthConfig`
- `servers` — mapped to `ServerConfig` entries for the environment switcher
- `info` — mapped to `AppMeta`

## Swagger 2.0 adapter

Handles Swagger 2.0 (formerly OpenAPI 2.0) documents. The adapter normalises Swagger 2.0 constructs to the same IR shape:

- `definitions` → `components/schemas` equivalent
- `basePath` + `host` → `servers`
- `securityDefinitions` → `components/securitySchemes` equivalent
- `produces` / `consumes` → `requestContentType`

The output IR is identical regardless of whether the input was OpenAPI 3.x or Swagger 2.0.

## `$ref` resolution

Both adapters perform full `$ref` resolution before building the IR. This means:

- Circular references are detected and broken safely
- Inline schemas and `$ref` schemas produce the same `SchemaNode` output
- Deeply nested `$ref` chains are fully resolved

## Graceful degradation

Real-world specs are often incomplete or non-standard. The adapters are designed to degrade gracefully rather than fail:

- **Missing schemas** — operations with no response schema produce a generic key-value `SchemaNode`
- **Unknown field types** — unmapped types fall back to `'string'`
- **Malformed operations** — skipped with a `console.warn`; recorded in `UIGenApp.parsingErrors`
- **Missing `servers`** — defaults to `http://localhost:3000`

Parsing errors are available in `ir.parsingErrors` for debugging.

## Using the adapter directly

You can call `parseSpec` from `@uigen-dev/core` to parse a spec programmatically:

```typescript
import { parseSpec } from '@uigen-dev/core';
import { readFileSync } from 'fs';

const yaml = readFileSync('./openapi.yaml', 'utf-8');
const ir = await parseSpec(yaml);

console.log(ir.meta.title);       // "Petstore API"
console.log(ir.resources.length); // number of detected resources
```

`parseSpec` auto-detects the spec format (OpenAPI 3.x vs Swagger 2.0) and selects the appropriate adapter.
