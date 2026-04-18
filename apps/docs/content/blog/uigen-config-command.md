---
title: "Introducing the UIGen Config Command: Visual Annotation Management"
author: "Olebogeng Mbedzi"
date: "2026-04-18"
excerpt: "A deep dive into UIGen's new config command that provides a visual interface for managing x-uigen annotations without touching your spec files."
tags: ["features", "config", "annotations", "developer-experience"]
---

## Introduction

UIGen generates fully functional frontends from OpenAPI and Swagger specs with zero configuration. But real-world APIs are messy. Field names are inconsistent. Some endpoints should be hidden. Others need custom labels. Authentication flows vary wildly.

That is where x-uigen annotations come in. These vendor extensions let you control how UIGen interprets your spec: which fields to hide, which endpoints handle login, how to label form inputs, and how to link related resources.

Until now, adding these annotations meant manually editing your spec file. If your spec is auto-generated from code, shared across teams, or managed by a different tool, that is a problem. You cannot just add custom fields to a file you do not own.

The new `uigen config` command solves this. It opens a visual interface where you can manage all annotation configurations without touching your spec file. Changes are saved to a separate `.uigen/config.yaml` file that the `serve` command reads automatically. Your source spec stays pristine.

This post walks through how the config command works, the design decisions behind it, and how the enhanced ignore support makes it easy to control exactly what appears in your generated UI.

---

## The Problem: Customization Without Modification

Every API-driven tool faces the same challenge: users need to customize behavior, but they cannot always modify the source file.

Consider these scenarios:

**Auto-generated specs.** Your OpenAPI spec is generated from FastAPI decorators or Django REST Framework serializers. Every time you regenerate the spec, manual edits are lost.

**Shared specs.** Your spec is used by multiple tools: UIGen for the frontend, Postman for testing, code generators for SDKs. Adding UIGen-specific annotations pollutes the spec for other consumers.

**Third-party specs.** You are building a UI for an external API. You do not control the spec file and cannot add vendor extensions.

**Team workflows.** Your spec lives in a different repo, owned by the backend team. Frontend customizations should not require backend changes.

The traditional solution is to fork the spec or write a preprocessing script. Both are fragile. UIGen takes a different approach: keep customizations in a separate config file that is merged at runtime.

---

## How It Works

The config command starts a visual interface for managing annotations. Here is the full workflow:

```bash
uigen config openapi.yaml
```

This command:

1. Validates that `openapi.yaml` exists
2. Starts a Vite dev server hosting the config GUI
3. Injects the spec path into the GUI via `window.__UIGEN_SPEC_PATH__`
4. Opens your default browser to `http://localhost:4401`
5. Provides API endpoints for reading and writing the config file

The GUI displays your complete spec structure: all resources, operations, fields, parameters, request bodies, and responses. You can toggle annotations on any element, set default values, and see immediate visual feedback.

When you save changes, they are written to `.uigen/config.yaml` in your project directory. The next time you run `uigen serve`, the config is automatically loaded and merged with your spec in memory. The source spec file is never modified.

---

## Config File Structure

The config file uses YAML and has three sections:

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

**enabled:** Declares which annotation types are active. If an annotation is disabled, it is skipped during processing even if present in the spec.

**defaults:** Sets fallback values for annotations. If a field does not have an explicit annotation, the default is applied.

**annotations:** Maps element paths to annotation objects. This is where your customizations live.

### Element Path Syntax

The path syntax identifies where annotations should be applied.

For operations, use `METHOD:/path/to/endpoint`:

```yaml
POST:/api/v1/users:
  x-uigen-ignore: true

GET:/users/{id}:
  x-uigen-label: "Get User Details"
```

For schema properties, use `SchemaName.propertyName`:

```yaml
User.email:
  x-uigen-label: "Email Address"

Product.price:
  x-uigen-label: "Price (USD)"
```

Nested properties use dot notation:

```yaml
User.address.street:
  x-uigen-label: "Street Address"

Order.shippingInfo.carrier:
  x-uigen-ignore: true
```

The reconciler resolves `$ref` references automatically, so you can annotate properties in referenced schemas without knowing the full path.

---

## Visual Annotation Management

The config GUI provides specialized controls for each annotation type. This is where the system shines: instead of writing YAML by hand, you interact with the spec visually.

### x-uigen-ignore: Toggle Switches

The ignore annotation controls which elements appear in the generated UI. The GUI displays toggle switches on every supported element type:

- Schema properties (individual fields)
- Schema objects (entire models)
- Parameters (query, path, header, cookie)
- Request bodies
- Responses (200, 201, 400, etc.)
- Operations (GET, POST, PUT, DELETE)

When you toggle an element to ignored, it is immediately dimmed in the visual editor. All child elements are also dimmed to show they are excluded due to parent pruning.

### x-uigen-label: Inline Text Editing

The label annotation customizes field names in forms and tables. The GUI provides inline text inputs: click on any field label to edit it. Changes are saved immediately to the config file.

This is particularly useful for APIs with inconsistent naming. Your spec might have `usr_email_addr`, but your UI can display "Email Address" without touching the spec.

### x-uigen-ref: Drag-and-Drop Linking

The ref annotation creates relationships between resources. If a `Product` has a `categoryId` field, you can link it to the `Category` resource so the UI renders a dropdown instead of a text input.

The GUI provides drag-and-drop linking: drag from the `categoryId` field to the `Category` resource. A dialog prompts you to specify `valueField` (the ID field) and `labelField` (the display field). The annotation is saved automatically.

### x-uigen-login: Operation Selector

The login annotation marks which operation handles authentication. The GUI provides a dropdown of all POST operations. Select the login endpoint, and UIGen generates a login form that redirects to the dashboard on success.

### Future Annotations

The system is designed to be extensible. When new annotations are added to the codebase, they automatically appear in the GUI with appropriate controls. The visual editor inspects the annotation's parameter schema and generates the right input type: text fields for strings, toggles for booleans, dropdowns for enums, drag-and-drop for references.

This follows the open-closed principle: the GUI is open for extension (new annotations just work) but closed for modification (no GUI code changes needed).

---

## Enhanced Ignore Support

The ignore annotation was recently enhanced to support fine-grained control over what appears in the generated UI. The config GUI provides excellent visual feedback for understanding and managing ignore behavior.

### Supported Element Types

You can now toggle ignore on:

**Schema properties:** Hide sensitive fields like `password`, `ssn`, or `internalId` from all views.

**Schema objects:** Exclude entire models like `AuditLog` or `InternalMetadata` from the UI.

**Parameters:** Hide debug parameters like `_trace` or `_internal` from forms.

**Request bodies:** Prevent operations with internal payloads from generating input forms.

**Responses:** Exclude internal response structures from detail views and tables.

**Operations:** Hide admin-only or deprecated endpoints from the UI.

### Visual Feedback

The GUI provides immediate visual feedback when you toggle ignore:

**Dimming:** Ignored elements are displayed with 50% opacity. This makes it instantly clear which parts of your spec are excluded.

**Badges:** Each element shows a badge indicating the annotation source:
- "Explicit" for elements with a direct annotation
- "Inherited" for elements excluded due to parent pruning
- "Override" for elements that explicitly include themselves despite an ignored parent

**Tooltips:** Hover over any element to see why it is ignored. The tooltip explains whether the element has an explicit annotation or is inherited from a parent.

### Precedence Visualization

When multiple levels have ignore annotations, the GUI shows which one is active. The precedence order is:

```
property > schema object > parameter > operation > path item
```

The Precedence Panel displays the complete annotation hierarchy for the selected element. Each level shows whether an annotation exists (true, false, or undefined), and the active annotation is highlighted.

This makes it easy to understand complex inheritance scenarios. If a schema has `x-uigen-ignore: true` but a specific property has `x-uigen-ignore: false`, the property is included (override).

### Pruning Behavior

When you ignore a parent element, all children are automatically excluded. This is called pruning. The GUI visualizes this with tree branch icons showing parent-child relationships.

When you toggle a parent to ignored, all children are immediately dimmed. When you toggle a parent to active, all children are restored (unless they have explicit ignore annotations).

This makes it easy to exclude large sections of your spec with a single toggle. For example, ignoring the `AuditLog` schema automatically excludes all its properties, all operations that return it, and all parameters that reference it.

### Override Workflow

Sometimes you want to exclude most of a structure while including specific fields. The GUI makes this easy with Override buttons.

When a child element is inactive due to parent pruning, an "Override" button appears next to its toggle. Click it to set `x-uigen-ignore: false` on the child. The child is immediately displayed as active with an "Override" badge.

This is useful for scenarios like: ignore the entire `User` schema except for `id`, `name`, and `email`. You toggle the schema to ignored, then override the three fields you want to keep.

### Show/Hide Pruned Elements

For cleaner visualization, the GUI provides a "Show Pruned Elements" toggle. When disabled, children of ignored parents are hidden from the tree view. This reduces clutter and lets you focus on active elements.

When you toggle a parent to active, the children are immediately shown. The preference is saved in browser local storage.

---

## Config Reconciliation

The config file is merged with your spec at runtime using a reconciler. The reconciliation happens in memory before the spec reaches the adapter, so the source file is never modified.

### Core Principles

**Non-destructive:** The source spec file on disk is never touched. All changes happen in memory.

**Idempotent:** Applying the reconciliation twice produces the same result as applying it once. No side effects accumulate.

**Deterministic:** Given the same spec and the same config, the reconciliation always produces the same output. The order of annotations in the config file does not matter.

**Config takes precedence:** If both the spec and the config define the same annotation on the same element, the config value wins. This lets you override annotations in the spec without editing it.

### Generic Annotation Handling

A key design decision is that the reconciler treats all `x-uigen-*` annotations generically. It does not have a hardcoded list of annotation names.

```typescript
// The reconciler does NOT do this:
if (annotation === 'x-uigen-ignore') { ... }
if (annotation === 'x-uigen-label') { ... }

// It does this instead:
for (const [key, value] of Object.entries(annotations)) {
  element[key] = value; // Works for any x-uigen-* annotation
}
```

This means new annotations work automatically without any changes to the reconciler code. When a new annotation handler is registered, it is immediately configurable via the config file and the config GUI.

### Integration with Serve Command

When you run `uigen serve`, the CLI checks for `.uigen/config.yaml`. If it exists, the config is loaded and applied before processing the spec.

```typescript
// Simplified serve command flow
const spec = readSpecFile(specPath);
const config = loadConfigFile('.uigen/config.yaml');
const reconciledSpec = reconcile(spec, config);
const ir = adapter.parse(reconciledSpec);
```

If the config file does not exist, the spec is processed with all annotations enabled and no custom defaults. This is the current behavior, so existing projects are unaffected.

---

## Auto-Discovery and Extensibility

The config GUI automatically discovers all registered annotations via the AnnotationHandlerRegistry. This makes the system extensible without requiring GUI updates.

### How It Works

When the GUI loads, it queries the registry for all registered handlers:

```typescript
const handlers = AnnotationHandlerRegistry.getAll();

for (const handler of handlers) {
  const metadata = {
    name: handler.name,
    description: handler.description,
    parameterSchema: handler.parameterSchema,
    targetType: handler.targetType, // field-level, operation-level, resource-level
    examples: handler.examples,
  };
  
  displayAnnotationInGUI(metadata);
}
```

The metadata is derived from the handler's TypeScript type definitions and JSDoc comments. No manual schema registration is required.

### Adding New Annotations

To add a new annotation:

1. Create a handler class implementing the `AnnotationHandler` interface
2. Register it in the `AnnotationHandlerRegistry`
3. That is it

The annotation automatically appears in the config GUI with appropriate controls based on its parameter schema. The reconciler applies it generically. The adapter processes it according to the handler's logic.

This architecture makes UIGen extensible by design. Contributors can add new annotations without touching the CLI, GUI, or reconciler code.

---

## Live Preview

The config GUI includes a live preview that shows how your annotation settings affect the generated UI. When you change an annotation, the preview updates within 500ms.

The preview uses the same rendering logic as the main `serve` command, so what you see is exactly what you get. It shows at least one example of each view type affected by the changed annotation: forms, lists, and detail views.

When an annotation is disabled, the preview shows the UI as it would appear without that annotation applied. This makes it easy to compare before and after states.

---

## Performance and Usability

The config GUI is designed to handle large specs efficiently.

**Virtualization:** The tree view uses virtualization to render only visible elements. Specs with 100+ operations and 50+ schemas load in under 2 seconds.

**Debounced writes:** Config file writes are debounced to avoid excessive disk I/O. Multiple changes within 500ms are batched into a single write.

**Memoization:** The visual editor uses memoization to avoid re-rendering unchanged elements when a sibling is toggled.

**Undo/redo:** The GUI maintains an undo/redo stack for all toggle actions. You can experiment with different configurations without losing work. Keyboard shortcuts (Ctrl+Z, Ctrl+Y) are supported.

**Bulk actions:** Multi-select elements (Ctrl+Click, Shift+Click) and apply bulk actions like "Ignore All" or "Include All". This is useful for large specs where you want to hide many elements at once.

**Search and filter:** Search for elements by name or path. Filter by annotation state: "Show Ignored Only", "Show Active Only", "Show Overrides Only".

**Keyboard navigation:** Navigate the tree with arrow keys, toggle with Enter, expand/collapse with Space. All interactive elements are keyboard accessible.

---

## Cross-Platform Support

The config command works on Windows, macOS, and Linux. The CLI uses platform-agnostic path resolution and opens the browser using platform-specific commands:

- macOS: `open`
- Windows: `start`
- Linux: `xdg-open`

If the default browser cannot be detected, the CLI logs the URL and instructs you to open it manually.

The Vite server binds to `localhost` and is accessible from any browser. The config file uses forward slashes for paths on all platforms.

---

## Error Handling and Validation

The config GUI provides clear error messages and actionable suggestions.

**Spec parsing errors:** If the spec file cannot be parsed, the GUI displays the error in a dedicated panel and disables preview functionality.

**Config file errors:** If the config file is malformed, the reconciler logs a parse error with line and column information. Unknown annotation names trigger warnings but do not crash the serve command.

**Validation errors:** If you enter an invalid parameter value, the GUI displays an inline error message within 200ms. The error explains the expected type and format.

**Port conflicts:** If the default port (4401) is in use, the CLI retries with the next available port and logs the actual port used.

**Circular references:** If a circular reference is detected in ignored schemas, the GUI displays an error with the schema path and suggests checking references.

**Empty views:** If all properties in a schema are ignored, the GUI displays a warning: "All properties in [schema_name] are ignored. This schema will produce empty views."

---

## Export and Sharing

The config GUI provides an "Export Ignore Summary" button that generates a markdown or JSON file listing all ignored elements. The summary includes:

- Element path
- Element type (property, schema, parameter, etc.)
- Annotation value (true/false)
- Annotation source (explicit/inherited)

Elements are grouped by type: Ignored Schemas, Ignored Properties, Ignored Parameters, Ignored Request Bodies, Ignored Responses, Ignored Operations.

This makes it easy to review and share the exclusion list with your team. The summary file is timestamped: `ignore-summary-2026-04-18.md`.

---

## Accessibility

The config GUI is built with accessibility in mind:

**ARIA labels:** All toggle switches have descriptive labels: "Toggle ignore for [element_name]".

**ARIA live regions:** State changes are announced to screen readers: "[element_name] is now ignored" or "[element_name] is now included".

**Keyboard accessibility:** All interactive elements are keyboard accessible. No mouse-only interactions.

**Color contrast:** Dimmed elements maintain at least 3:1 contrast ratio against the background.

**Screen reader navigation:** Proper heading hierarchy and landmark regions for screen reader navigation.

---

## Getting Started

To try the config command:

```bash
# Start the config GUI
uigen config openapi.yaml

# The GUI opens at http://localhost:4401
# Make your changes, then save

# Run serve to see the result
uigen serve openapi.yaml
```

The config file is saved to `.uigen/config.yaml`. Commit it to version control so your team shares the same configuration.

If you want to reset to defaults, delete the config file and restart the GUI. It will initialize with all annotations enabled and no custom defaults.

---

## Roadmap

The config command is actively being developed. Upcoming features include:

**Schema reference tracking:** See which operations and properties are affected when you ignore a schema object. The References panel shows all elements that reference the schema and updates in real-time.

**Annotation templates:** Save common annotation patterns as templates and apply them to multiple elements at once.

**Config diffing:** Compare two config files to see what changed. Useful for reviewing pull requests or debugging configuration issues.

**Import from spec:** If your spec already has x-uigen annotations, import them into the config file with one click. This makes it easy to migrate from inline annotations to external config.

**Multi-spec support:** Manage annotations for multiple specs in a single config file. Useful for microservice architectures where each service has its own spec.

---

## Conclusion

The `uigen config` command solves a real problem: how to customize generated UIs without modifying source files. The visual interface makes annotation management intuitive, the config file keeps customizations separate from the spec, and the reconciler merges them at runtime.

The enhanced ignore support provides fine-grained control over what appears in the UI, with excellent visual feedback for understanding precedence, pruning, and overrides. The auto-discovery system makes the GUI extensible without code changes.

If you are using UIGen, try the config command on your next project. If you are evaluating UIGen, the config system is a key differentiator: it lets you customize behavior without forking specs or writing preprocessing scripts.

The config GUI is open source and lives in the `packages/config-gui` directory of the UIGen monorepo. Contributions are welcome. If you have ideas for new annotations or GUI features, open an issue or submit a PR on GitHub.

```bash
# Try it now
npx @uigen-dev/cli config your-openapi.yaml
```
