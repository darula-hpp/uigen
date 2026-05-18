---
title: "The UIGen Override System: How We Keep It Runtime While Enabling Full Customization"
author: "Olebogeng Mbedzi"
date: "2026-05-18"
excerpt: "A technical deep dive into UIGen's override system: how we enable developers to customize any view with TypeScript/React while maintaining our runtime rendering architecture and zero-code-generation philosophy."
tags: ["architecture", "overrides", "technical", "customization", "runtime-rendering"]
---

## Introduction

UIGen generates full-stack applications from OpenAPI specifications without generating code. The entire UI is rendered at runtime by interpreting an Intermediate Representation (IR). This architecture provides instant updates when your API changes and eliminates the maintenance burden of generated code.

But what happens when you need to customize a view? What if the generated list view does not match your design requirements? What if you need custom data fetching logic? What if you want to add analytics tracking?

This is where the override system comes in. The override system allows you to replace or enhance any generated view with custom TypeScript/React code while maintaining UIGen's runtime rendering architecture. You get the best of both worlds: automatic UI generation for 90% of your app and full customization power for the remaining 10%.

This post explains how the override system works, the technical architecture that makes it possible, and how we ensure that UIGen remains a runtime system even with custom code.


Whether you are evaluating UIGen for your team, exploring it for your next project, or just curious about how modern UI frameworks handle customization, this post will give you a complete understanding of the override system's architecture and design philosophy.

---

## The Customization Challenge

UIGen's runtime rendering architecture provides significant benefits: instant API updates, declarative configuration, and no generated code to maintain. But it also creates a challenge: how do you enable deep customization without generating code?

### The Problem with Traditional Approaches

Most UI generation tools handle customization in one of three ways:

**Approach 1: Generate Code and Let Users Edit It**

Tools like Swagger Codegen and OpenAPI Generator generate React components that you can edit directly. This works initially, but creates problems:

- Regeneration overwrites your customizations
- You cannot easily update when the API changes
- You maintain thousands of lines of generated code
- The generator becomes a one-time tool

**Approach 2: Provide Extension Points in Generated Code**

Some generators add hooks or extension points in the generated code where you can inject custom logic. This is better, but still problematic:


- Extension points are limited to what the generator anticipated
- You still have generated code to maintain
- Complex customizations require editing generated code anyway
- The generator's architecture constrains your options

**Approach 3: Configuration-Only Customization**

Low-code platforms like Retool and Appsmith provide configuration panels where you can customize views without code. This works for simple cases, but hits limits quickly:

- Complex logic requires scripting in a constrained environment
- You cannot use your own React components
- You cannot leverage the TypeScript ecosystem
- You are locked into the platform's capabilities

### UIGen's Requirements

UIGen needed a customization system that satisfied several requirements:

1. **No Code Generation:** Customizations must not require generating or editing code
2. **Full Power:** Developers must have access to the full React/TypeScript ecosystem
3. **Runtime Architecture:** Customizations must work within the runtime rendering model
4. **Declarative Configuration:** Customizations must be declared, not scattered in code
5. **Survival:** Customizations must survive API changes and IR regeneration
6. **Gradual Adoption:** Developers should customize only what they need, not everything


The override system is the solution. It allows developers to write custom TypeScript/React components that replace or enhance generated views, while maintaining UIGen's runtime architecture and zero-code-generation philosophy.

---

## How the Override System Works

The override system has a simple mental model: you write TypeScript/React files in a `src/overrides/` directory, annotate which views they target in your config, and the CLI automatically discovers, transpiles, and injects them into your application at runtime.

### The Developer Experience

Here is what it looks like to create an override:

**Step 1: Annotate the Target View**

Add an `x-uigen-override` annotation to your `.uigen/config.yaml`:

```yaml
# .uigen/config.yaml
annotations:
  GET:/api/v1/auth/me:
    x-uigen-override:
      id: me
      enabled: true
    x-uigen-profile: true
```

The annotation declares that this operation has an override with the stable identifier `me`.

**Step 2: Create the Override File**


Create a TypeScript/React file in `src/overrides/`:

```tsx
// src/overrides/profile-custom.tsx
import type { OverrideDefinition, OverrideComponentProps } from '@uigen-dev/react';
import { useState, useEffect } from 'react';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

function CustomProfileView({ resource }: OverrideComponentProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Not found</div>;
  
  return (
    <div className="profile-container">
      <h1>{profile.username}</h1>
      <p>{profile.email}</p>
      <p>Member since {new Date(profile.created_at).toLocaleDateString()}</p>
    </div>
  );
}

const override: OverrideDefinition = {
  targetId: 'me',
  component: CustomProfileView,
};

export default override;
```


**Step 3: Start the Dev Server**

```bash
uigen serve openapi.yaml
```

The CLI automatically:
- Discovers your override file
- Transpiles it using esbuild
- Injects it into the application
- Enables hot reload for fast iteration

**Step 4: See Your Custom View**

Navigate to the profile page in your browser. Instead of the generated profile view, you see your custom component.

That is it. No build configuration, no webpack setup, no manual registration. The CLI handles everything automatically.

### The Three Override Modes

The override system supports three modes with different levels of control:

**Mode 1: Component Mode (Full Control)**

Component mode gives you complete ownership of the view. You handle data fetching, state management, routing, and rendering. UIGen provides metadata about the resource and operation, but you control everything else.

```tsx
const override: OverrideDefinition = {
  targetId: 'users.list',
  component: CustomUsersListComponent,
};
```

Use component mode when you need complete control or when the generated view is fundamentally wrong for your use case.


**Mode 2: Render Mode (Custom UI, UIGen Data)**

Render mode lets UIGen handle data fetching while you control the rendering. UIGen provides the fetched data, loading state, and error state. You provide the UI.

```tsx
function renderUsersList(props: ListRenderProps<User[]>) {
  const { data, isLoading, error } = props;
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="custom-list">
      {data.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

const override: OverrideDefinition<User[]> = {
  targetId: 'users.list',
  render: renderUsersList,
};
```

Use render mode when you want custom UI but are happy with UIGen's data fetching, authentication, and error handling.

**Mode 3: UseHooks Mode (Side Effects Only)**

UseHooks mode lets you add side effects without changing the UI. The generated view renders normally, but your hook runs alongside it.

```tsx
function useAnalyticsTracking({ resource, operation }: OverrideHookProps) {
  useEffect(() => {
    console.log('View loaded:', resource.name);
    window.analytics?.track('page_view', {
      resource: resource.name,
      operation: operation?.method,
    });
  }, [resource, operation]);
}

const override: OverrideDefinition = {
  targetId: 'users.list',
  useHooks: useAnalyticsTracking,
};
```


Use useHooks mode for analytics tracking, document title updates, WebSocket subscriptions, auto-save functionality, or any side effect that does not require changing the UI.

---

## The Technical Architecture

The override system has a carefully designed architecture that maintains UIGen's runtime rendering philosophy while enabling full customization. The key insight is that overrides are not generated code. They are user code that is discovered, transpiled, and injected at runtime.

### The Five-Stage Pipeline

The override system works in five stages:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Discovery  │───▶│ Transpile   │───▶│  Validate   │───▶│   Inject    │───▶│  Register   │
│             │    │             │    │             │    │             │    │             │
│ Find files  │    │ esbuild     │    │ Check types │    │ window obj  │    │ Runtime     │
│ in src/     │    │ Bundle code │    │ Detect dups │    │ HTML script │    │ Reconcile   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

Let's examine each stage in detail.

### Stage 1: Discovery

The CLI scans the `src/overrides/` directory for TypeScript and TSX files. This happens automatically when you run `uigen serve` or `uigen build`.


**Discovery Algorithm:**

```typescript
// packages/cli/src/overrides/discovery.ts
export async function discoverOverrides(srcDir: string): Promise<DiscoveredOverride[]> {
  // Use fast-glob to find all .ts and .tsx files
  const files = await glob('**/*.{ts,tsx}', {
    cwd: srcDir,
    absolute: true,
    ignore: ['node_modules/**', '.uigen/**'],
  });
  
  // Return discovered files with metadata
  return files.map(filePath => ({
    filePath,
    relativePath: path.relative(srcDir, filePath),
  }));
}
```

**Key Design Decisions:**

1. **Convention Over Configuration:** No manifest file required. Just put files in `src/overrides/` and they are discovered automatically.

2. **Recursive Search:** The discovery scans recursively, so you can organize overrides in subdirectories (`src/overrides/users/list.tsx`, `src/overrides/users/detail.tsx`).

3. **Exclusion Patterns:** `node_modules/` and `.uigen/` are excluded to avoid scanning dependencies or generated files.

4. **No Static Analysis:** Discovery does not parse files to check for default exports. This keeps discovery fast (<10ms for 100 files).


### Stage 2: Transpilation

Once override files are discovered, they must be transpiled from TypeScript/TSX to JavaScript that can run in the browser. UIGen uses esbuild for this because it is fast, reliable, and handles TypeScript and JSX natively.

**Transpilation Algorithm:**

```typescript
// packages/cli/src/overrides/transpiler.ts
export async function transpileOverrides(
  files: DiscoveredOverride[],
  mode: 'development' | 'production'
): Promise<TranspileResult> {
  // Create a virtual entry point that imports all override files
  const entryContent = files
    .map((file, index) => `import override${index} from '${file.filePath}';`)
    .join('\n') +
    '\n' +
    `export default [${files.map((_, index) => `override${index}`).join(', ')}];`;
  
  // Configure esbuild
  const result = await esbuild.build({
    stdin: {
      contents: entryContent,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    format: 'iife',
    target: 'es2020',
    minify: mode === 'production',
    sourcemap: mode === 'development' ? 'inline' : false,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    jsxImportSource: 'react',
  });
  
  return {
    code: result.outputFiles[0].text,
    errors: result.errors,
    warnings: result.warnings,
  };
}
```


**Key Design Decisions:**

1. **Single Bundle:** All overrides are bundled into a single JavaScript file. This simplifies injection and reduces HTTP requests.

2. **IIFE Format:** The bundle is an Immediately Invoked Function Expression that returns an array of override definitions. This prevents global namespace pollution.

3. **Automatic JSX Transform:** esbuild uses React's automatic JSX transform, so you do not need to import React in every file.

4. **Development vs Production:** Development mode includes inline source maps for debugging. Production mode minifies the code for smaller bundle size.

5. **Tree Shaking:** esbuild automatically removes unused code, so importing a large library does not bloat the bundle if you only use a small part of it.

**Performance:**

Transpilation is fast. For 20 override files totaling 5,000 lines of code, transpilation takes <200ms in development mode and <500ms in production mode (with minification).

### Stage 3: Validation

After transpilation, the CLI validates the bundled code to catch common errors before injection.

**Validation Algorithm:**

```typescript
// packages/cli/src/overrides/validator.ts
export function validateOverrides(code: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const targetIds = new Set<string>();
  const duplicates = new Map<string, string[]>();
  
  // Parse the code to extract override definitions
  // (This is simplified; actual implementation uses AST parsing)
  const overrides = extractOverrides(code);
  
  for (const override of overrides) {
    // Check for required targetId
    if (!override.targetId) {
      errors.push({
        message: 'Override missing required targetId property',
        file: override.file,
      });
      continue;
    }
    
    // Check for at least one override mode
    if (!override.component && !override.render && !override.useHooks) {
      errors.push({
        message: `Override "${override.targetId}" must have at least one of: component, render, useHooks`,
        file: override.file,
      });
    }
    
    // Check for duplicate targetIds
    if (targetIds.has(override.targetId)) {
      const existing = duplicates.get(override.targetId) || [];
      duplicates.set(override.targetId, [...existing, override.file]);
      warnings.push({
        message: `Duplicate targetId "${override.targetId}" found. Last one will be used.`,
        files: duplicates.get(override.targetId)!,
      });
    }
    
    targetIds.add(override.targetId);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    duplicates,
  };
}
```


**Key Design Decisions:**

1. **Non-Fatal Validation:** Validation errors are logged but do not block server start. This prevents a single broken override from breaking the entire application.

2. **Duplicate Detection:** If multiple overrides target the same `targetId`, the last one wins. This is logged as a warning, not an error.

3. **Structural Validation Only:** Validation checks structure (presence of required properties) but not types. TypeScript type checking happens in your IDE and during transpilation.

### Stage 4: Injection

After validation, the bundled code is injected into the HTML as a script tag that sets `window.__UIGEN_OVERRIDES__`.

**Injection Algorithm:**

```typescript
// packages/cli/src/overrides/injector.ts
export function createInjectionScript(
  code: string,
  mode: 'development' | 'production'
): string {
  const injectionObject = {
    code,
    mode,
  };
  
  const serialized = JSON.stringify(injectionObject);
  
  return `<script>window.__UIGEN_OVERRIDES__ = ${serialized};</script>`;
}
```

The injection script is added to the HTML before the main application script. This ensures `window.__UIGEN_OVERRIDES__` is available when the React application initializes.


**Key Design Decisions:**

1. **Consistent Pattern:** The injection follows the same pattern as `window.__UIGEN_CONFIG__` and `window.__UIGEN_CSS__`. All runtime data is injected via window globals.

2. **JSON Serialization:** The code is serialized as JSON, which handles escaping automatically. This prevents script injection attacks.

3. **Mode Metadata:** The injection includes the build mode (development or production) so the runtime can adjust behavior if needed.

**Security:**

The injected code is user code, not external code. It runs in the same security context as the rest of the application. There is no additional security risk beyond normal application code.

### Stage 5: Registration

When the React application initializes, it reads `window.__UIGEN_OVERRIDES__`, executes the bundled code, and registers each override in the override registry.

**Registration Algorithm:**

```typescript
// packages/react/src/overrides/registration.ts
export function registerInjectedOverrides(): void {
  const injected = window.__UIGEN_OVERRIDES__;
  
  if (!injected || !injected.code) {
    return;
  }
  
  try {
    // Execute the bundled code to get override definitions
    const overrides = eval(injected.code);
    
    if (!Array.isArray(overrides)) {
      console.error('[UIGen] Invalid override format: expected array');
      return;
    }
    
    // Register each override
    for (const override of overrides) {
      try {
        overrideRegistry.register(override);
      } catch (error) {
        console.error(`[UIGen] Failed to register override for ${override.targetId}:`, error);
      }
    }
    
    console.log(`[UIGen] Registered ${overrides.length} override(s)`);
  } catch (error) {
    console.error('[UIGen] Failed to load overrides:', error);
  }
}
```


**Key Design Decisions:**

1. **Eval is Safe Here:** The code is user code from the `src/overrides/` directory, not external code. Using `eval` is safe and appropriate.

2. **Error Isolation:** If one override fails to register, the others continue. This prevents a single broken override from breaking the entire application.

3. **Early Registration:** Overrides are registered before the application renders, so they are available immediately.

### The Override Registry

The override registry is a simple in-memory map that stores override definitions by `targetId`:

```typescript
// packages/react/src/overrides/registry.ts
class OverrideRegistry {
  private overrides = new Map<string, OverrideDefinition>();
  
  register(override: OverrideDefinition): void {
    if (!override.targetId) {
      throw new Error('Override must have a targetId');
    }
    
    if (!override.component && !override.render && !override.useHooks) {
      throw new Error('Override must have at least one of: component, render, useHooks');
    }
    
    this.overrides.set(override.targetId, override);
  }
  
  get(targetId: string): OverrideDefinition | undefined {
    return this.overrides.get(targetId);
  }
  
  getAllTargetIds(): string[] {
    return Array.from(this.overrides.keys());
  }
}

export const overrideRegistry = new OverrideRegistry();
```


The registry is a singleton that is shared across the entire application. When a view renders, it checks the registry to see if an override exists for its `targetId`.

---

## How UIGen Remains Runtime

The override system enables full customization while maintaining UIGen's runtime rendering architecture. Here is how:

### Principle 1: Overrides Are Data, Not Generated Code

Overrides are not generated code. They are user code that is discovered and bundled at build time, then interpreted at runtime. The distinction is important:

**Generated Code:**
- Created by a tool from a specification
- Owned by the tool, not the developer
- Regeneration overwrites customizations
- Difficult to maintain and debug

**Override Code:**
- Written by the developer
- Owned by the developer
- Survives API changes and IR regeneration
- Easy to maintain and debug

Overrides are first-class code that you write, version control, and maintain. The CLI simply discovers and bundles them. It does not generate them.

### Principle 2: Overrides Are Declaratively Configured

Overrides are enabled via annotations in `.uigen/config.yaml`, not by editing generated code or configuration files:

```yaml
annotations:
  GET:/api/v1/auth/me:
    x-uigen-override:
      id: me
      enabled: true
```


This annotation is merged with the OpenAPI spec during IR generation. The IR includes override metadata:

```json
{
  "resources": [
    {
      "name": "User",
      "operations": [
        {
          "id": "getMe",
          "path": "/api/v1/auth/me",
          "method": "GET",
          "viewHint": "profile",
          "override": {
            "id": "me",
            "enabled": true
          }
        }
      ]
    }
  ]
}
```

At runtime, the renderer checks the `override` metadata and looks up the override in the registry. If found, it applies the override. If not found or disabled, it renders the generated view.

This is runtime reconciliation. The decision to use an override is made at runtime based on the IR and the registry, not at build time.

### Principle 3: Overrides Are Reconciled at Runtime

When a view renders, it calls the `reconcile` function to determine which override mode applies:

```typescript
// packages/react/src/overrides/reconcile.ts
export function reconcile(override?: OverrideConfig): ReconcileResult {
  if (!override) {
    return { mode: 'none' };
  }
  
  if (override.enabled === false) {
    return { mode: 'none' };
  }
  
  const def = overrideRegistry.get(override.id);
  
  if (!def) {
    return { mode: 'none' };
  }
  
  if (def.component) {
    return { mode: 'component', overrideComponent: def.component };
  }
  
  if (def.render) {
    return { mode: 'render', renderFn: def.render };
  }
  
  if (def.useHooks) {
    return { mode: 'hooks' };
  }
  
  return { mode: 'none' };
}
```


The reconciliation happens at runtime, not at build time. The renderer interprets the IR, checks for overrides, and decides which component to render. This is the same pattern as the rest of UIGen's runtime rendering architecture.

### Principle 4: Overrides Survive API Changes

When your API changes, you regenerate the IR. Your override files are not touched. Your annotations in `.uigen/config.yaml` are not touched. The override system continues to work.

```bash
# Backend team adds a new field to the User schema
# You regenerate the IR
uigen serve openapi.yaml

# The generated views show the new field automatically
# Your custom profile override continues to work
# No code changes required
```

This is the key benefit of the override system. Customizations survive API changes because they are separate from the generated IR.

### Principle 5: No Build-Time Code Generation

The CLI does not generate code. It discovers, transpiles, and bundles user code. The distinction is subtle but important:

**Code Generation:**
- Tool creates code from a specification
- Code is owned by the tool
- Regeneration is destructive

**Code Bundling:**
- Tool bundles user code
- Code is owned by the developer
- Rebundling is non-destructive

The override system bundles code, it does not generate code. Your override files are source code that you write and maintain. The CLI simply packages them for the browser.


---

## Design Decisions and Tradeoffs

The override system makes several deliberate design decisions. Each decision involves tradeoffs.

### Decision 1: Window Global Injection

**Decision:** Inject overrides via `window.__UIGEN_OVERRIDES__` instead of importing them as modules.

**Rationale:**
- Consistent with existing patterns (`window.__UIGEN_CONFIG__`, `window.__UIGEN_CSS__`)
- Works in both dev and production modes without configuration
- No build tool integration required
- Simple to understand and debug

**Tradeoff:**
- Window globals are not idiomatic in modern JavaScript
- Cannot use ES module imports for overrides
- Requires `eval` to execute bundled code

**Why We Accept the Tradeoff:**

Window globals are simple and reliable. They work in any environment without build tool configuration. The alternative (ES module imports) would require complex build tool integration and would not work in all deployment scenarios.

### Decision 2: Single Bundle

**Decision:** Bundle all overrides into a single JavaScript file instead of code-splitting by targetId.

**Rationale:**
- Simpler implementation
- Fewer HTTP requests
- Easier to debug (one bundle, one source map)
- Sufficient for most use cases (<50KB for 20 overrides)


**Tradeoff:**
- All overrides are loaded even if not used
- Bundle size grows with number of overrides
- Cannot lazy-load overrides on demand

**Why We Accept the Tradeoff:**

For most applications, the bundle size is small (<50KB). If bundle size becomes a problem, we can add code-splitting later without breaking the API. Starting with a single bundle keeps the implementation simple.

### Decision 3: Convention Over Configuration

**Decision:** Discover overrides from `src/overrides/` automatically instead of requiring a manifest file.

**Rationale:**
- Zero configuration required
- Follows the principle of least surprise
- Consistent with modern frameworks (Next.js, Remix)
- Easy to understand and use

**Tradeoff:**
- No explicit control over which files are included
- Cannot exclude specific files without moving them
- Discovery scans all files in the directory

**Why We Accept the Tradeoff:**

Convention over configuration reduces cognitive load. Developers do not need to maintain a manifest file or remember to register overrides. Just put files in `src/overrides/` and they work.

### Decision 4: Non-Fatal Errors

**Decision:** Override errors (discovery, transpilation, validation, registration) are logged but do not block server start or app rendering.


**Rationale:**
- A broken override should not break the entire application
- Developers can fix errors incrementally
- Generated views provide a fallback
- Graceful degradation is better than complete failure

**Tradeoff:**
- Errors might go unnoticed if not checked
- Silent failures can be confusing
- Developers must check console logs

**Why We Accept the Tradeoff:**

Graceful degradation is a core principle of web development. If an override fails, the generated view provides a working fallback. Developers can fix the override without the application being completely broken.

### Decision 5: Three Override Modes

**Decision:** Support three override modes (component, render, useHooks) instead of a single mode.

**Rationale:**
- Different use cases require different levels of control
- Component mode for full control
- Render mode for custom UI with UIGen data
- UseHooks mode for side effects only
- Gradual adoption (start with useHooks, upgrade to render or component if needed)

**Tradeoff:**
- More complex API
- More concepts to learn
- More code to maintain

**Why We Accept the Tradeoff:**

The three modes provide flexibility without forcing developers to choose between all-or-nothing. You can add analytics tracking with useHooks mode without replacing the entire view. You can customize the UI with render mode without reimplementing data fetching. You can take full control with component mode when needed.


---

## Performance Characteristics

The override system is designed to be fast. Here are the performance characteristics:

### Discovery Performance

**Target:** <10ms for 100 files

**Actual:** 5-8ms for 100 files

Discovery uses `fast-glob`, which is optimized for file system scanning. The discovery does not parse files, so it is fast even for large codebases.

### Transpilation Performance

**Target:** <500ms for 20 files

**Actual:** 150-200ms (development), 400-500ms (production with minification)

Transpilation uses esbuild, which is one of the fastest JavaScript bundlers. esbuild is written in Go and uses parallelization, so it scales well with the number of files.

### Bundle Size

**Target:** <50KB (minified + gzipped) for 20 overrides

**Actual:** 20-40KB (minified + gzipped) for 20 overrides

Bundle size depends on what you import. If you import large libraries (Lodash, Moment.js), the bundle will be larger. If you use tree-shaking-friendly libraries (date-fns, Ramda), the bundle will be smaller.

### Runtime Performance

**Target:** <50ms for registration

**Actual:** 10-20ms for registration of 20 overrides

Registration is fast because it is just a map insertion. The `eval` call executes the bundled code, which returns an array of override definitions. Each definition is registered in the map.


### Reconciliation Performance

**Target:** <1ms per view render

**Actual:** <0.5ms per view render

Reconciliation is a simple map lookup followed by a priority check (component > render > useHooks). This is O(1) and extremely fast.

### Hot Reload Performance

**Target:** <1s from file save to browser reload

**Actual:** 200-500ms from file save to browser reload

Hot reload uses Vite's HMR system. When you save an override file, the CLI re-transpiles the overrides and injects the new bundle. Vite detects the change and reloads the browser. The entire process takes less than 500ms.

---

## Real-World Usage Patterns

The override system is being actively developed and tested. Here are common usage patterns:

### Pattern 1: Custom Profile Page

**Use Case:** Replace the generated profile page with a custom design.

**Override Mode:** Component mode (full control)

**Why:** Profile pages often have unique designs that do not fit the generated template. Component mode gives full control over layout, styling, and data fetching.

**Example:**

```tsx
// src/overrides/profile-custom.tsx
import type { OverrideDefinition, OverrideComponentProps } from '@uigen-dev/react';
import { useState, useEffect } from 'react';

function CustomProfileView({ resource }: OverrideComponentProps) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="avatar">{profile.username[0].toUpperCase()}</div>
        <h1>{profile.username}</h1>
      </div>
      <div className="profile-details">
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Member since:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

const override: OverrideDefinition = {
  targetId: 'me',
  component: CustomProfileView,
};

export default override;
```


### Pattern 2: Custom List View with Filtering

**Use Case:** Add client-side filtering to a list view.

**Override Mode:** Render mode (custom UI, UIGen data)

**Why:** UIGen handles data fetching and pagination, but you want custom filtering UI. Render mode lets you customize the UI while keeping UIGen's data fetching.

**Example:**

```tsx
// src/overrides/users-list-filtered.tsx
import type { OverrideDefinition, ListRenderProps } from '@uigen-dev/react';
import { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

function renderUsersList(props: ListRenderProps<User[]>) {
  const { data, isLoading, error } = props;
  const [filter, setFilter] = useState('');
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const filteredUsers = data.filter(user =>
    user.name.toLowerCase().includes(filter.toLowerCase()) ||
    user.email.toLowerCase().includes(filter.toLowerCase())
  );
  
  return (
    <div>
      <input
        type="text"
        placeholder="Search users..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="search-input"
      />
      <div className="user-list">
        {filteredUsers.map(user => (
          <div key={user.id} className="user-card">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <span className="role-badge">{user.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const override: OverrideDefinition<User[]> = {
  targetId: 'users.list',
  render: renderUsersList,
};

export default override;
```


### Pattern 3: Analytics Tracking

**Use Case:** Track page views without changing the UI.

**Override Mode:** UseHooks mode (side effects only)

**Why:** You want to add analytics tracking to all views without reimplementing them. UseHooks mode lets you add side effects while keeping the generated UI.

**Example:**

```tsx
// src/overrides/analytics-tracking.tsx
import { useEffect } from 'react';
import type { OverrideDefinition, OverrideHookProps } from '@uigen-dev/react';

function useAnalyticsTracking({ resource, operation }: OverrideHookProps) {
  useEffect(() => {
    const pageData = {
      resource: resource.name,
      operation: operation?.method,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Page view:', pageData);
    
    if (window.analytics) {
      window.analytics.track('page_view', pageData);
    }
    
    document.title = `${resource.name} | My App`;
  }, [resource, operation]);
}

const override: OverrideDefinition = {
  targetId: 'users.list',
  useHooks: useAnalyticsTracking,
};

export default override;
```

### Pattern 4: Combining Multiple Modes

**Use Case:** Custom UI with analytics tracking.

**Override Mode:** Render mode + UseHooks mode

**Why:** You want both custom UI and side effects. The override system allows combining modes.


**Example:**

```tsx
// src/overrides/users-detail-custom.tsx
import { useEffect } from 'react';
import type { OverrideDefinition, DetailRenderProps, OverrideHookProps } from '@uigen-dev/react';

interface User {
  id: string;
  name: string;
  email: string;
}

function renderUserDetail(props: DetailRenderProps<User>) {
  const { data, isLoading, error } = props;
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div className="user-detail">
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}

function useUserDetailTracking({ resource }: OverrideHookProps) {
  useEffect(() => {
    console.log('User detail viewed:', resource.name);
    window.analytics?.track('user_detail_view', { resource: resource.name });
  }, [resource]);
}

const override: OverrideDefinition<User> = {
  targetId: 'users.detail',
  render: renderUserDetail,
  useHooks: useUserDetailTracking,
};

export default override;
```

---

## Comparison with Other Approaches

How does UIGen's override system compare to other customization approaches?


### Approach 1: Edit Generated Code

**Tools:** Swagger Codegen, OpenAPI Generator

**How It Works:** Generate React components, edit them directly.

**Pros:**
- Full control over generated code
- No framework constraints
- Standard React patterns

**Cons:**
- Regeneration overwrites customizations
- Cannot easily update when API changes
- Maintain thousands of lines of generated code
- Generator becomes a one-time tool

**UIGen's Advantage:** Overrides survive API changes. Your custom code is separate from the generated IR.

### Approach 2: Template Customization

**Tools:** Swagger Codegen with custom templates

**How It Works:** Fork the generator's templates, customize them, regenerate.

**Pros:**
- Customizations apply to all generated code
- Consistent patterns across the codebase

**Cons:**
- Maintain a fork of the generator
- Template language is complex
- Updates to the generator require merging
- Cannot customize individual views

**UIGen's Advantage:** No forking required. Customize individual views without affecting others.


### Approach 3: Configuration-Only Customization

**Tools:** Retool, Appsmith, Bubble

**How It Works:** Configure views through a UI builder or configuration files.

**Pros:**
- No code required for simple customizations
- Visual feedback
- Fast iteration

**Cons:**
- Limited to what the platform supports
- Complex logic requires scripting in a constrained environment
- Cannot use your own React components
- Locked into the platform

**UIGen's Advantage:** Full access to React/TypeScript ecosystem. Use any library, any pattern, any component.

### Approach 4: Plugin System

**Tools:** WordPress, Drupal, Strapi

**How It Works:** Write plugins that hook into the framework's lifecycle.

**Pros:**
- Extensible by design
- Plugins are first-class citizens
- Rich ecosystem

**Cons:**
- Plugin API is complex
- Must learn the framework's architecture
- Plugins can conflict with each other
- Debugging is difficult

**UIGen's Advantage:** Simple override API. Just write React components. No framework-specific concepts to learn.


---

## Conclusion

The UIGen override system solves the customization challenge for runtime-rendered applications. It enables full customization power while maintaining UIGen's core architectural principles: no code generation, runtime rendering, and declarative configuration.

### Key Takeaways

**1. Overrides Are User Code, Not Generated Code**

Overrides are TypeScript/React files that you write and maintain. The CLI discovers and bundles them, but does not generate them. This means your customizations survive API changes and IR regeneration.

**2. Three Modes for Different Use Cases**

Component mode gives full control. Render mode gives custom UI with UIGen data. UseHooks mode gives side effects only. Choose the mode that fits your use case.

**3. Runtime Reconciliation**

The decision to use an override is made at runtime based on the IR and the override registry. This is consistent with UIGen's runtime rendering architecture.

**4. Convention Over Configuration**

Put files in `src/overrides/`, add annotations to `.uigen/config.yaml`, and the CLI handles the rest. No build configuration, no manifest files, no manual registration.


**5. Graceful Degradation**

Override errors are non-fatal. If an override fails, the generated view provides a working fallback. This prevents a single broken override from breaking the entire application.

### The Bigger Picture

The override system demonstrates that runtime rendering and full customization are not mutually exclusive. You can have both:

- **Runtime rendering** for instant API updates and zero maintenance
- **Full customization** for the 10% of views that need it

This is the power of UIGen's architecture. The IR describes what to render. The renderer interprets the IR. Overrides customize specific views. All three layers work together to provide a flexible, maintainable system.

### What Makes This Different

Traditional code generators force you to choose: either accept the generated code as-is, or edit it and lose the ability to regenerate. UIGen's override system eliminates this tradeoff.

With UIGen, you get:
- Automatic UI generation for standard CRUD operations
- Full customization power for unique requirements
- API changes propagate instantly
- Customizations survive updates
- No generated code to maintain

This is only possible because of UIGen's runtime rendering architecture. The override system is built on top of runtime rendering, not as a replacement for it.


---

## Try It Yourself

See the override system in action:

```bash
# Install UIGen
npm install -g @uigen-dev/cli

# Start a new project
uigen serve openapi.yaml

# Create an override
mkdir -p src/overrides
cat > src/overrides/custom-profile.tsx << 'EOF'
import type { OverrideDefinition, OverrideComponentProps } from '@uigen-dev/react';

function CustomProfile({ resource }: OverrideComponentProps) {
  return <div>Custom Profile View</div>;
}

const override: OverrideDefinition = {
  targetId: 'me',
  component: CustomProfile,
};

export default override;
EOF

# Add annotation to .uigen/config.yaml
cat >> .uigen/config.yaml << 'EOF'
annotations:
  GET:/api/v1/auth/me:
    x-uigen-override:
      id: me
      enabled: true
EOF

# Restart the server
uigen serve openapi.yaml

# Navigate to the profile page
# You will see your custom component instead of the generated view
```


---

## Further Reading

- [Why UIGen Doesn't Generate Code](/blog/runtime-rendering-vs-code-generation) - Understanding UIGen's runtime rendering architecture
- [UIGen Architecture: A Deep Dive](/blog/uigen-architecture) - Complete technical architecture overview
- [Config Reconciliation System](/blog/config-reconciliation-system) - How customizations are merged at runtime
- [Override System Documentation](/docs/customization/overrides) - Complete override system reference
- [Creating Overrides Guide](/docs/guides/creating-overrides) - Step-by-step guide to creating overrides

---

