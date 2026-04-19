---
title: "Config Reconciliation: Runtime Annotation Merging Without Touching Your Spec"
author: "UIGen Team"
date: "2026-04-19"
excerpt: "A deep dive into UIGen's Config Reconciliation System: how it merges user annotations at runtime, why it is non-destructive and deterministic, and how it enables customization without spec modification."
tags: ["architecture", "config", "technical", "reconciliation"]
---

## Introduction

Every API-driven tool faces the same challenge: users need to customize behavior, but they cannot always modify the source file. Your OpenAPI spec might be auto-generated from code, shared across teams, or owned by a different service. Adding custom annotations directly to the spec is fragile at best and impossible at worst.

UIGen solves this with the Config Reconciliation System: a runtime annotation merging subsystem that applies user-defined overrides from `.uigen/config.yaml` to your OpenAPI or Swagger spec without ever touching the source file. The reconciliation happens in memory, is completely non-destructive, and follows strict correctness guarantees: idempotent, deterministic, and config-takes-precedence.

This post is a technical deep dive into how the reconciliation system works, the design decisions that make it reliable, the algorithms that power element path resolution, and the property-based testing strategy that ensures correctness across thousands of spec variations.

Whether you are using UIGen and want to understand what happens when you save a config file, evaluating UIGen for your team, or building a similar system, this post will give you a complete picture of the reconciliation architecture.

---

## The Problem: Customization Without Modification

Consider these real-world scenarios:

**Auto-generated specs.** Your OpenAPI spec is generated from FastAPI decorators or Django REST Framework serializers. Every time you regenerate the spec, manual edits are lost. You need a way to apply customizations that survive regeneration.

**Shared specs.** Your spec is used by multiple tools: UIGen for the frontend, Postman for testing, code generators for SDKs. Adding UIGen-specific annotations pollutes the spec for other consumers. You need a way to keep customizations separate.

**Third-party specs.** You are building a UI for an external API. You do not control the spec file and cannot add vendor extensions. You need a way to customize without forking.

**Team workflows.** Your spec lives in a different repo, owned by the backend team. Frontend customizations should not require backend changes. You need a way to decouple concerns.

The traditional solutions are all fragile:

- Fork the spec and maintain a separate copy (divergence risk)
- Write a preprocessing script that modifies the spec before UIGen reads it (brittle)
- Manually edit the spec and hope regeneration does not overwrite your changes (unreliable)

UIGen takes a different approach: keep customizations in a separate config file that is merged at runtime. The source spec stays pristine. The config file is version-controlled alongside your frontend code. The reconciliation happens in memory before the spec reaches the adapter.

---

## Core Principles

The Config Reconciliation System is built on four core principles that guarantee correctness and predictability.

### 1. Non-Destructive

The source spec file on disk is never modified. All changes happen in memory. After reconciliation completes, the source spec file has identical content to before reconciliation started.

This is verified by property-based tests that deep-compare the source spec object before and after reconciliation across thousands of randomly generated specs and configs.

### 2. Idempotent

Applying reconciliation twice produces the same result as applying it once. There are no side effects that accumulate.

Formally: `reconcile(reconcile(spec, config), config) === reconcile(spec, config)`

This property is critical for reliability. It means the reconciliation can be run multiple times (during hot reloading, for example) without corrupting the spec. It also means the order of operations does not matter: reconciling then validating produces the same result as validating then reconciling.

### 3. Deterministic

Given the same spec and the same config, the reconciliation always produces the same output. The order of annotations in the config file does not matter. The order of properties in the spec does not matter.

This is achieved by sorting all element paths and annotation names alphabetically before applying them. The reconciler processes annotations in a fixed order, so the output is always identical for the same inputs.

### 4. Config Takes Precedence

When both the spec and the config define the same annotation on the same element, the config value wins. This lets you override annotations in the spec without editing it.

This precedence rule is what makes the config file useful. If the spec has `x-uigen-ignore: false` on a field but the config has `x-uigen-ignore: true`, the field is ignored. The config is the source of truth for customizations.

---

## Architecture

The reconciliation system has five components, each with a single responsibility.

```
┌─────────────────┐
│  Serve Command  │
└────────┬────────┘
         │
         ├──▶ ┌──────────────────┐
         │    │  Config Loader   │──▶ Reads .uigen/config.yaml
         │    └──────────────────┘    Parses YAML → ConfigFile
         │
         ├──▶ ┌──────────────────┐
         │    │  Spec Loader     │──▶ Reads OpenAPI/Swagger YAML
         │    └──────────────────┘    Parses YAML → Source Spec
         │
         ▼
    ┌─────────────────────────────────────────┐
    │         Reconciler (Core)               │
    │                                         │
    │  ┌────────────────────────────────┐   │
    │  │  Element Path Resolver         │   │
    │  │  - Parses element paths        │   │
    │  │  - Locates spec elements       │   │
    │  │  - Caches resolved paths       │   │
    │  └────────────────────────────────┘   │
    │                                         │
    │  ┌────────────────────────────────┐   │
    │  │  Annotation Merger             │   │
    │  │  - Deep clones source spec     │   │
    │  │  - Applies config annotations  │   │
    │  │  - Handles null (removal)      │   │
    │  │  - Deterministic ordering      │   │
    │  └────────────────────────────────┘   │
    │                                         │
    │  ┌────────────────────────────────┐   │
    │  │  Validator                     │   │
    │  │  - Validates reconciled spec   │   │
    │  │  - Checks $ref integrity       │   │
    │  │  - Verifies required fields    │   │
    │  └────────────────────────────────┘   │
    └─────────────────┬───────────────────────┘
                      │
                      ▼
              ┌──────────────────┐
              │ Reconciled Spec  │──▶ In-memory only
              │ (OpenAPI 3.x or  │    Used for IR generation
              │  Swagger 2.0)    │    API proxy, view rendering
              └──────────────────┘
```

### Config Loader

The Config Loader checks for `.uigen/config.yaml` in the project root, parses it into a `ConfigFile` object, and validates the structure. If the config does not exist, the loader returns null and the serve command uses the source spec without reconciliation. This is graceful degradation: existing projects without config files work exactly as before.

If the config is malformed (invalid YAML syntax, missing required fields), the loader logs a descriptive error and exits with a non-zero status code. The error message includes the file path, line number, and expected structure.

### Element Path Resolver

The Element Path Resolver is the most complex component. It takes an element path string like `POST:/api/v1/users` or `User.email` and locates the corresponding element in the spec.

The resolver supports three path types:

**Operations:** `METHOD:/path/to/endpoint`
- Examples: `POST:/api/v1/users`, `GET:/users/{id}`, `DELETE:/items/{itemId}`
- Supports all HTTP methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- Path parameters must match exactly (e.g., `/users/{id}` not `/users/{userId}`)

**Schema Properties:** `SchemaName.propertyName`
- Examples: `User.email`, `Product.price`, `Address.street`
- Nested properties: `User.address.street`, `Order.items.quantity`
- Resolves `$ref` references automatically

**Parameters:** `METHOD:/path:parameterName`
- Examples: `GET:/users:limit`, `POST:/items:Authorization`
- Distinguishes query, header, path, and cookie parameters

The resolver caches resolved paths in a Map for performance. When the same path is requested multiple times (common during reconciliation), the cached result is returned immediately.

If a path cannot be resolved, the resolver returns null and logs a warning with suggestions. The suggestion algorithm uses Levenshtein distance to find similar valid paths. For example, if you type `POST:/api/v1/userz`, the resolver suggests `POST:/api/v1/users`.

### Annotation Merger

The Annotation Merger applies annotations from the config to the spec. It deep clones the source spec before modification to ensure non-mutation, then iterates over all element paths in the config in alphabetical order.

For each element path, the merger:

1. Resolves the path to locate the spec element
2. Sorts the annotation names alphabetically
3. Applies each annotation to the element

The merger handles three cases:

**Override:** If the annotation exists in both spec and config, the config value wins.

**Preserve:** If the annotation exists in the spec but not in the config, the spec value is preserved.

**Remove:** If the config annotation value is null, the annotation is removed from the spec.

The null-removal feature is critical for overriding unwanted spec annotations. If your spec has `x-uigen-ignore: false` on a field but you want to ignore it, you set `x-uigen-ignore: null` in the config. The annotation is removed from the reconciled spec, and the default ignore behavior applies.

The merger distinguishes null (remove) from false (set to false). This is important for boolean annotations: `x-uigen-ignore: false` means "explicitly include this field" while `x-uigen-ignore: null` means "remove the annotation and use the default behavior".

### Validator

The Validator checks that the reconciled spec is still a valid OpenAPI or Swagger document. It verifies:

- Required fields are present (openapi/swagger version, info, paths)
- All `$ref` references still resolve
- No structural corruption occurred during reconciliation

If validation fails, the reconciler logs the error with the element path and exits with a non-zero status code. The serve command does not start with an invalid spec.

Validation is optional and can be disabled via `ReconcilerOptions` for performance-critical scenarios, but it is enabled by default.

### Reconciler Orchestrator

The Reconciler orchestrates all components. It:

1. Deep clones the source spec
2. Invokes the Element Path Resolver for each config annotation
3. Invokes the Annotation Merger to apply annotations
4. Invokes the Validator to check the reconciled spec
5. Returns a `ReconciledSpec` with metadata (applied annotation count, warnings)

The reconciler logs activity at four levels:

- **Info:** Reconciliation start and completion with summary
- **Debug:** Each annotation applied (element path + annotation name)
- **Warning:** Unresolved element paths with suggestions
- **Error:** Validation failures with context

The logging is configurable via `ReconcilerOptions`. In production, you might disable debug logging for performance. In development, you might enable verbose logging to understand what the reconciler is doing.

---

## Element Path Resolution Algorithm

The element path resolution algorithm is the heart of the reconciliation system. It needs to handle three path types, resolve `$ref` references, and provide helpful error messages when paths are invalid.

### Operation Path Resolution

For operation paths like `POST:/api/v1/users`, the algorithm:

1. Splits the path on the first colon: `["POST", "/api/v1/users"]`
2. Normalizes the method to lowercase for spec lookup: `"post"`
3. Looks up the path in `spec.paths["/api/v1/users"]`
4. Looks up the operation by method: `pathItem["post"]`
5. Returns the operation object

If the path or method does not exist, the algorithm returns null and logs a warning.

Path parameters are matched exactly. If your spec has `/users/{id}` but your config has `/users/{userId}`, the path does not match. This is intentional: path parameter names are part of the API contract and should not be fuzzy-matched.

### Schema Property Path Resolution

For schema property paths like `User.address.street`, the algorithm:

1. Splits the path on dots: `["User", "address", "street"]`
2. Locates the schema in `spec.components.schemas["User"]` (OpenAPI 3.x) or `spec.definitions["User"]` (Swagger 2.0)
3. Resolves `$ref` if the schema is a reference
4. Navigates to `schema.properties["address"]`
5. Resolves `$ref` if the property is a reference
6. Navigates to `address.properties["street"]`
7. Returns the property object

The algorithm resolves `$ref` references at each level. This is critical for specs that use `$ref` extensively. If `User.address` is a reference to `Address`, the algorithm resolves it automatically and continues navigating.

Only internal references are supported (`#/components/schemas/X` or `#/definitions/X`). External references (`http://example.com/schemas/User.yaml`) are not resolved because they require network requests and introduce non-determinism.

### $ref Resolution

The `$ref` resolution algorithm handles internal JSON Pointer references:

1. Check that the reference starts with `#/` (internal reference)
2. Remove the `#/` prefix: `#/components/schemas/User` → `components/schemas/User`
3. Split on `/`: `["components", "schemas", "User"]`
4. Navigate the spec object: `spec["components"]["schemas"]["User"]`
5. Return the resolved object

If any step fails (reference does not start with `#/`, path does not exist), the algorithm returns null.

Circular references are detected by tracking visited references in a Set. If a reference is visited twice, the algorithm returns null and logs a warning.

---

## Generic Annotation Handling

A key design decision is that the reconciler treats all `x-uigen-*` annotations generically. It does not have a hardcoded list of annotation names. This follows the open-closed principle: the reconciler is open for extension (new annotations just work) but closed for modification (no code changes needed).

```typescript
// The reconciler does NOT do this:
if (annotation === 'x-uigen-ignore') { ... }
if (annotation === 'x-uigen-label') { ... }
if (annotation === 'x-uigen-login') { ... }

// It does this instead:
for (const [annotationName, value] of Object.entries(annotations)) {
  if (value === null) {
    delete element[annotationName]; // Remove annotation
  } else {
    element[annotationName] = value; // Set or override annotation
  }
}
```

This means when a new annotation is added to UIGen (like `x-uigen-wizard` or `x-uigen-theme`), it automatically works with the reconciler without any code changes. The config GUI discovers it via the AnnotationHandlerRegistry, the reconciler applies it generically, and the adapter processes it according to the handler's logic.

This architecture makes UIGen extensible by design. Contributors can add new annotations without touching the reconciler code.

---

## Config File Structure

The config file uses YAML and has four sections:

```yaml
version: "1.0"

enabled:
  x-uigen-ignore: true
  x-uigen-login: true
  x-uigen-label: true
  x-uigen-ref: true

defaults:
  x-uigen-ignore:
    value: false

annotations:
  POST:/api/v1/auth/login:
    x-uigen-login: true
  
  User.password:
    x-uigen-ignore: true
  
  User.email:
    x-uigen-label: "Email Address"
  
  Product.categoryId:
    x-uigen-ref:
      resource: "Category"
      valueField: "id"
      labelField: "name"
```

**version:** The config file format version. Currently `"1.0"`. This allows future breaking changes to the config format without breaking existing files.

**enabled:** Declares which annotation types are active. If an annotation is disabled, it is skipped during processing even if present in the spec or config. This is useful for temporarily disabling an annotation without removing it from the config.

**defaults:** Sets fallback values for annotations. If an element does not have an explicit annotation, the default is applied. This is useful for setting project-wide preferences like "ignore all password fields by default".

**annotations:** Maps element paths to annotation objects. This is where your customizations live. Each key is an element path, and each value is an object with annotation names as keys.

The config file is parsed using a standard YAML parser (js-yaml). It supports YAML 1.2 syntax, including anchors, aliases, and multi-line strings.

When the config GUI saves a config file, it formats it with 2-space indentation and preserves the section order (version, enabled, defaults, annotations). This makes the file human-readable and easy to edit manually if needed.

---

## Integration with Serve Command

The reconciliation happens automatically when you run `uigen serve`. The CLI checks for `.uigen/config.yaml` and applies it before processing the spec.

```typescript
// Simplified serve command flow
const spec = readSpecFile(specPath);
const config = loadConfigFile('.uigen/config.yaml');

let processedSpec = spec;
if (config) {
  const reconciled = reconcile(spec, config);
  processedSpec = reconciled.spec;
  
  if (reconciled.warnings.length > 0) {
    for (const warning of reconciled.warnings) {
      console.warn(`Warning: ${warning.message}`);
      if (warning.suggestion) {
        console.warn(`  Did you mean: ${warning.suggestion}`);
      }
    }
  }
  
  console.log(`Applied ${reconciled.appliedAnnotations} annotations from config`);
}

const ir = adapter.parse(processedSpec);
```

If the config file does not exist, the spec is processed without reconciliation. This is graceful degradation: existing projects work exactly as before.

If the config file is malformed, the reconciler logs an error and exits. The serve command does not start with an invalid config.

The reconciled spec is used for all runtime operations: IR generation, API proxy, view rendering. The source spec file is watched for changes (not the reconciled spec), so hot reloading works correctly.

---

## Property-Based Testing

The reconciliation system is tested using property-based testing with fast-check. Property-based testing verifies universal correctness properties across thousands of randomly generated inputs, catching edge cases that example-based tests miss.

The system has 20 correctness properties, each tested with 100+ iterations. Here are the key properties:

### Property 1: Config Precedence

For any valid OpenAPI/Swagger spec and config file, when an annotation exists in both the source spec and config for the same element path, the reconciled spec SHALL contain the config value (not the spec value).

This property verifies the core precedence rule. It generates random specs with annotations, random configs with conflicting annotations, and verifies that the config value always wins.

### Property 2: Idempotence and Determinism

For any valid OpenAPI/Swagger spec and config file, applying reconciliation twice SHALL produce the same result as applying it once, and applying reconciliation multiple times SHALL always produce identical results.

Formally: `reconcile(reconcile(spec, config), config) === reconcile(spec, config)`

This property verifies that reconciliation has no side effects and produces deterministic output.

### Property 3: Output Validity Preservation

For any valid OpenAPI/Swagger spec and valid config file, the reconciled spec SHALL be a valid OpenAPI/Swagger document that conforms to the schema.

This property verifies that reconciliation never corrupts the spec structure. It generates random valid specs and configs, reconciles them, and validates the output against the OpenAPI/Swagger schema.

### Property 4: Source Spec Non-Mutation

For any valid OpenAPI/Swagger spec object and config file, after reconciliation completes, the source spec object SHALL be deeply equal to its state before reconciliation (no in-memory mutation).

This property verifies the non-destructive guarantee. It deep-compares the source spec before and after reconciliation to ensure no mutation occurred.

### Property 11: Null Annotation Removal

For any valid OpenAPI/Swagger spec and config file, when a config annotation has a null value, that annotation SHALL be removed from the reconciled spec (not present in the output).

This property verifies the null-removal feature. It generates random specs with annotations, random configs with null values, and verifies that the annotations are removed.

### Property 12: False vs Null Distinction

For any valid OpenAPI/Swagger spec and config file, when a config annotation has an explicit false value, the reconciled spec SHALL contain that annotation set to false (not removed).

This property verifies that the reconciler distinguishes null (remove) from false (set to false). It generates random specs and configs with false values and verifies that the annotations are preserved.

### Property 19: Generic Annotation Support

For any annotation matching the pattern `x-uigen-*` in a config file, the reconciler SHALL apply that annotation to the corresponding element without requiring hardcoded support for that specific annotation name.

This property verifies the generic annotation handling. It generates random annotation names matching `x-uigen-*`, applies them via the reconciler, and verifies that they appear in the reconciled spec.

The full list of 20 properties is documented in the design document. Each property is implemented as a fast-check test with 100+ iterations, using custom generators for valid OpenAPI/Swagger specs, valid config files, and valid element paths.

---

## Error Handling and Logging

The reconciliation system provides clear error messages and actionable suggestions.

### Config Loading Errors (Fatal)

If the config file is malformed, the loader logs an error and exits:

```
Error: Failed to load config file: .uigen/config.yaml
Reason: YAML syntax error at line 12: unexpected token
```

If required fields are missing, the loader logs an error with the expected structure:

```
Error: Invalid config file: .uigen/config.yaml
Missing required field: annotations
Expected structure:
  version: "1.0"
  enabled: { ... }
  defaults: { ... }
  annotations: { ... }
```

### Element Path Resolution Errors (Warning)

If an element path cannot be resolved, the reconciler logs a warning with suggestions:

```
Warning: Element path not found: POST:/api/v1/userz
Did you mean: POST:/api/v1/users?
Skipping annotation for this path.
```

The suggestion algorithm uses Levenshtein distance to find similar valid paths. If no similar paths are found (distance > 50% of path length), no suggestion is provided.

### Validation Errors (Fatal)

If the reconciled spec is invalid, the validator logs an error and exits:

```
Error: Reconciled spec is invalid
Path: paths./api/v1/users.post
Issue: Missing required field 'responses'
```

The error includes the element path (JSON Pointer) and a description of the validation failure.

### Logging Levels

The reconciler supports four logging levels:

- **Debug:** Each annotation applied (element path + annotation name)
- **Info:** Reconciliation start and completion with summary
- **Warning:** Unresolved element paths with suggestions
- **Error:** Validation failures with context

The logging level is configurable via `ReconcilerOptions`. In production, you might set `logLevel: 'info'` to reduce noise. In development, you might set `logLevel: 'debug'` to see exactly what the reconciler is doing.

---

## Performance Optimizations

The reconciliation system is designed to handle large specs efficiently.

### Path Resolution Caching

The Element Path Resolver caches resolved paths in a Map. When the same path is requested multiple times (common during reconciliation), the cached result is returned immediately without re-parsing or re-navigating the spec.

The cache is cleared at the start of each reconciliation to avoid stale data.

### Deep Clone Strategy

The Annotation Merger uses `structuredClone()` (Node 17+) for deep cloning when available. This is significantly faster than JSON round-trip cloning.

For older Node versions, the merger falls back to JSON round-trip cloning: `JSON.parse(JSON.stringify(spec))`. This loses functions, but OpenAPI/Swagger specs are pure data structures, so no information is lost.

### Deterministic Ordering

The merger sorts element paths and annotation names alphabetically before applying them. This ensures deterministic output without requiring expensive deep equality checks.

Sorting is O(n log n) where n is the number of annotations, which is typically small (< 100). The performance cost is negligible compared to the benefit of deterministic output.

### Lazy Validation

Validation is optional and can be disabled via `ReconcilerOptions`. If you are confident that your config is correct (for example, it was generated by the config GUI), you can disable validation to save time.

In practice, validation is fast (< 100ms for large specs) and is enabled by default for safety.

---

## Comparison with Other Approaches

How does the Config Reconciliation System compare to other customization approaches?

### Preprocessing Scripts

Some tools use preprocessing scripts that modify the spec before the main tool reads it. This approach has several problems:

- The script must be run manually before every invocation
- The script output must be stored somewhere (temp file, stdout)
- The script is language-specific (bash, Python, Node.js)
- The script is hard to test and maintain

The reconciliation system solves all of these problems. It runs automatically as part of the serve command, operates in memory, is language-agnostic (YAML config), and is thoroughly tested with property-based tests.

### Spec Forking

Some teams fork the spec and maintain a separate copy with customizations. This approach has several problems:

- The fork diverges from the source over time
- Merging upstream changes is manual and error-prone
- The fork must be kept in sync with the source
- The fork is a maintenance burden

The reconciliation system eliminates the need for forking. The source spec stays pristine, and customizations are kept in a separate config file that is easy to maintain and version-control.

### Inline Annotations

Some tools require annotations to be added directly to the spec. This approach has several problems:

- The spec is polluted with tool-specific annotations
- The spec cannot be shared with other tools
- The spec cannot be auto-generated without losing annotations
- The spec is harder to read and maintain

The reconciliation system keeps annotations separate from the spec. The source spec is clean and tool-agnostic. The config file is tool-specific and version-controlled alongside your frontend code.

---

## Future Enhancements

The reconciliation system is actively being developed. Upcoming features include:

**Hot reloading:** When the config file changes, the serve command will re-run reconciliation and push the updated reconciled spec to the browser via WebSocket. This enables live editing of annotations without restarting the server.

**Config diffing:** A CLI command to compare two config files and show what changed. Useful for reviewing pull requests or debugging configuration issues.

**Config templates:** Save common annotation patterns as templates and apply them to multiple elements at once. For example, a "hide all password fields" template that applies `x-uigen-ignore: true` to all properties named `password`, `passwd`, `pwd`, or `secret`.

**Multi-spec support:** Manage annotations for multiple specs in a single config file. Useful for microservice architectures where each service has its own spec. The config file would have a top-level `specs` section mapping spec paths to annotation sets.

**Import from spec:** If your spec already has x-uigen annotations, import them into the config file with one click. This makes it easy to migrate from inline annotations to external config.

---

## Conclusion

The Config Reconciliation System solves a real problem: how to customize generated UIs without modifying source files. The system is built on four core principles (non-destructive, idempotent, deterministic, config-takes-precedence) that guarantee correctness and predictability.

The architecture is clean and extensible. The Element Path Resolver handles three path types and resolves `$ref` references automatically. The Annotation Merger applies annotations generically, so new annotations work without code changes. The Validator ensures the reconciled spec is always valid.

The system is thoroughly tested with 20 property-based tests, each running 100+ iterations with randomly generated specs and configs. This catches edge cases that example-based tests miss and provides confidence that the system works correctly across the full spectrum of real-world API designs.

If you are using UIGen, the reconciliation system runs automatically when you use the config GUI or manually edit `.uigen/config.yaml`. If you are evaluating UIGen, the reconciliation system is a key differentiator: it lets you customize behavior without forking specs or writing preprocessing scripts.

The reconciliation system is open source and lives in the `packages/core/src/reconciler` directory of the UIGen monorepo. Contributions are welcome. If you have ideas for new features or find edge cases that the property tests miss, open an issue or submit a PR on GitHub.

```bash
# Try it now
npx @uigen-dev/cli serve your-openapi.yaml

# Or use the config GUI
npx @uigen-dev/cli config your-openapi.yaml
```
