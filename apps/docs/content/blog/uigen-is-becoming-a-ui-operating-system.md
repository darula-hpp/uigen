---
title: "UIGen is Becoming a UI Operating System"
author: "Olebogeng Mbedzi"
date: "2026-05-07"
excerpt: "What started as an OpenAPI-to-UI compiler accidentally evolved into something that looks, acts, and feels like an operating system for frontend applications. Here's how it happened and why the OS framing isn't just marketing."
tags: ["architecture", "operating-systems", "compiler", "technical"]
---

## The Accidental Discovery

I always had this thought: frontend work is really just an interpretation of the backend. So I wondered, can't we just compile an API spec to get a functioning frontend?

I started building. The first version was very CRUD-like. Health check endpoints would show up in the UI, which was noisy and ugly. So I added vendor extensions like `x-uigen-ignore` to filter out that noise. Then more extensions for polish. Until eventually, vendor extensions entered DSL territory because I didn't just want to build CRUD apps. I wanted to build complex SaaS products with OAuth, charting, i18n, and all the real-world features.

The twist came when I added an extension to define landing pages:

```yaml
openapi: 3.0.0
info:
  title: My SaaS App
  version: 1.0.0
x-uigen-landing-page:
  enabled: true
  sections:
    hero:
      enabled: true
      headline: "Welcome to My SaaS App"
      subheadline: "The all-in-one platform for modern teams"
```

That's when I realized this could actually be used to build real frontends. I kept adding extensions like `x-uigen-datetime` and `x-uigen-tz`. The philosophy became: users never repeat primitives, they declare them. For custom functionality, they extend the renderer, and it resolves whatever extra code was added at runtime without needing a rebuild.

I struggled with positioning this. I kept saying "it's a UI runtime," but the runtime just happened to be part of a larger system. I tried so hard to avoid the "frontend OS" framing, but it kept pulling me there.

Then I looked at the architecture diagram and realized: this isn't just a compiler. It has all the core layers of an operating system.

## Why It's Actually an OS

UIGen has three properties that make it an operating system rather than just a compiler or framework:

1. **Runtime execution environment**: It doesn't generate code, it interprets an IR at runtime
2. **Kernel/userland separation**: Core system services vs user extensions
3. **Dynamic module loading**: Extensions load at runtime without rebuilds

Let me explain each layer.

## The OS Architecture

Here's UIGen's execution pipeline:

```
Spec + Config → Reconciler → Adapter → IR → Runtime → Components
```

This maps directly to OS concepts:

### 1. The Kernel (Runtime)

In a traditional OS, the kernel manages processes, handles system calls, and provides core services. UIGen's runtime does the same for UI components.

The runtime handles:
- **Component lifecycle**: Mounting, updating, unmounting components based on routes
- **Routing**: Mapping URLs to component trees
- **Authentication**: Managing auth state and token refresh
- **API communication**: Proxying requests, handling retries, caching responses
- **State management**: Coordinating shared state across components

Components don't directly access these services. They go through the runtime's API (hooks like `useResource`, `useApiCall`, `useAuth`), just like processes use system calls to access kernel services.

### 2. The Compiler Pipeline

Traditional OS compilers transform high-level code into machine code. UIGen's compiler transforms OpenAPI specs into an Intermediate Representation (IR) that the runtime executes.

**Compilation stages:**

```
OpenAPI YAML
    ↓
Parser (js-yaml)
    ↓
Reconciler (merges config annotations)
    ↓
Adapter (semantic analysis)
    ↓
IR (framework-agnostic JSON)
    ↓
Runtime (interprets IR)
```

The IR is like bytecode or LLVM IR. It's framework-agnostic, so different renderers (React, Svelte, Vue) can consume the same IR, just like different CPU architectures execute the same LLVM IR.

**Why this matters:** You write the spec once, and it runs on any renderer. The IR is the portable format.

### 3. The Filesystem

Every OS has a filesystem. UIGen's is `.uigen/`:

```
.uigen/
├── config.yaml          # System configuration
├── theme.css            # User styling
├── assets/              # Static resources
│   └── logo.svg
└── plugins/             # Loadable modules
    └── custom-auth.ts
```

The CLI watches `.uigen/` for changes and triggers recompilation, just like inotify or FSEvents. When you edit `config.yaml`, the system recompiles the IR and hot-reloads the UI.

**Config reconciliation:** The reconciler merges annotations from `config.yaml` into the spec at compile time. This is like a preprocessor (think `#define` in C). Config annotations take precedence over spec annotations.

### 4. Dynamic Linking

Traditional OSes load shared libraries (`.so`, `.dll`) at runtime. UIGen loads custom components from `.uigen/plugins/`.

**How it works:**
1. At boot, the runtime scans `.uigen/plugins/`
2. Each plugin exports a `register` function
3. The runtime calls `register`, passing a component registry
4. Plugins register custom components by type
5. When the runtime needs a component, it looks it up in the registry

**Example plugin:**
```typescript
// .uigen/plugins/custom-auth.ts
export function register(registry) {
  registry.register('auth', CustomAuthComponent);
}

export const CustomAuthComponent = ({ config }) => {
  // Custom OAuth flow
  return <OAuthProvider config={config}>...</OAuthProvider>;
};
```

No rebuild required. The runtime discovers and loads plugins at boot, just like Linux loads kernel modules or browsers load extensions.

### 5. Device Drivers (Strategy Pattern)

OSes abstract hardware through device drivers. UIGen abstracts external systems (auth providers, file storage, payment gateways) through strategies.

**Example: OAuth strategies**
```typescript
// Built-in strategies
GoogleOAuthStrategy
GitHubOAuthStrategy
Auth0Strategy

// User-defined strategy
export class CustomOAuthStrategy implements OAuthStrategy {
  async authorize() { /* custom flow */ }
  async refresh(token) { /* custom refresh */ }
}

// Register at runtime
strategyRegistry.register('custom', new CustomOAuthStrategy());
```

Users can register custom strategies without modifying core code, just like writing a device driver.

## Why This Matters

### 1. Kernel/Userland Separation

Like an OS separates kernel space from user space, UIGen separates:
- **Kernel space**: Routing, auth, API calls, state management
- **User space**: Components, styling, business logic

Users can't break the kernel. They extend it through well-defined interfaces (plugins, strategies, hooks).

### 2. Portability

The IR is framework-agnostic. We're building Svelte and Vue renderers that consume the same IR. This is like how POSIX programs run on Linux, macOS, and BSD with the same system calls but different kernels.

### 3. Extensibility Without Rebuilds

Traditional frameworks require rebuilds when you add features. UIGen loads extensions at runtime. This is the difference between:
- **Monolithic kernel** (traditional frameworks): Rebuild to add features
- **Microkernel** (UIGen): Load modules dynamically

### 4. Declarative Configuration

OSes use config files (`/etc/fstab`, `/etc/nginx.conf`). UIGen uses `.uigen/config.yaml`. You declare what you want, the system figures out how.

### 5. Hot-Reloading

The CLI watches `.uigen/` for changes. When you edit a config file or plugin, it recompiles and pushes the new IR to the runtime via WebSocket. The UI updates without a full page reload.

## The Tradeoffs

### Runtime Overhead

Interpreting IR at runtime has overhead. But:
- The IR is small (~100KB for typical APIs)
- Parsing is fast (~50ms)
- The bottleneck is always the API, not the renderer

### Bundle Size

The runtime is ~200KB gzipped. Generated code might be smaller for simple apps. But for complex apps, the runtime amortizes because you're not duplicating CRUD logic across 50 resources.

### Debugging

Debugging interpreted systems is harder than debugging generated code. We're working on:
- Source maps from IR back to spec
- Runtime introspection tools
- Performance profiling

## Try It

```bash
npx @uigen-dev/cli@latest serve openapi.yaml
```

Point it at any OpenAPI spec. It boots a full UI in seconds.

The repo: [github.com/darula-hpp/uigen](https://github.com/darula-hpp/uigen)

## Conclusion

I didn't set out to build an operating system. I wanted to compile API specs into UIs. But as the system grew, it naturally evolved OS-like properties:
- A runtime kernel managing component lifecycle
- A compiler pipeline transforming specs to IR
- A filesystem for configuration and assets
- Dynamic linking for extensions
- Device drivers for external systems

The "UI Operating System" framing isn't marketing. It's the most accurate description of what UIGen has become.

What do you think? Am I crazy for calling this an OS? Or is there something here?

---

[GitHub](https://github.com/darula-hpp/uigen)
