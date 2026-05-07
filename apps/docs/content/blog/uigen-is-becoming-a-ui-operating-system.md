---
title: "UIGen is Becoming a UI Operating System"
author: "Olebogeng Mbedzi"
date: "2026-05-07"
excerpt: "What started as an OpenAPI-to-UI compiler accidentally evolved into something that looks, acts, and feels like an operating system for frontend applications. Here's how it happened and why the OS framing isn't just marketing."
tags: ["architecture", "operating-systems", "compiler", "technical"]
featured_image: "/blog/uigen-os.png"
---

## The Accidental Discovery

I always had this thought: frontend work is really just an interpretation of the backend. So I wondered—can't we just compile an API spec to get a functioning frontend?

I started building. The first version was very CRUD-like. Health check endpoints would show up in the UI, which was noisy and ugly. So I added vendor extensions like `x-uigen-ignore` to filter out that noise. Then more extensions for polish. Until eventually, vendor extensions entered DSL territory—because I didn't just want to build CRUD apps. I wanted to build complex SaaS products with OAuth, charting, i18n, and all the real-world features.

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

## The OS Architecture

Here's UIGen's execution pipeline:

```
Spec + Config → Reconciler → Adapter → IR → Kernel (Runtime) → Userland (Components)
                    ↓            ↓        ↓         ↓
                 Storage    Compiler   Memory   Scheduler
```

Let me map each layer to real OS concepts.

### 1. The Kernel: Process Management and Scheduling

In a traditional OS, the kernel manages processes, schedules tasks, handles interrupts, and provides system calls. UIGen's runtime does the same for UI components.

**Process Management:**
```typescript
// packages/react/src/App.tsx
export function App() {
  const config = window.__UIGEN_CONFIG__;
  
  // Process lifecycle management
  useEffect(() => {
    // Boot sequence
    initializeAuth();
    loadTheme();
    setupRouting();
    
    return () => {
      // Cleanup on shutdown
      teardownConnections();
    };
  }, []);
  
  // Component scheduler
  return (
    <Router>
      <LayoutContainer config={config.layout}>
        <Routes>
          {config.resources.map(resource => (
            <Route
              key={resource.slug}
              path={`/${resource.slug}`}
              element={<ResourceView resource={resource} />}
            />
          ))}
        </Routes>
      </LayoutContainer>
    </Router>
  );
}
```

The runtime manages component lifecycle just like a kernel manages process lifecycle:
- **Spawning**: Components are instantiated based on routes
- **Scheduling**: React's scheduler determines render priority
- **Context switching**: Route changes trigger component unmount/mount
- **Resource allocation**: Memory for component state, API connections

**System Calls:**
UIGen provides a system call interface through hooks:

```typescript
// packages/react/src/hooks/useApiCall.ts
export function useApiCall(operation: Operation) {
  // System call to network layer
  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch(operation.path, {
        method: operation.method,
        headers: getAuthHeaders(), // Kernel-managed auth state
        body: JSON.stringify(data),
      });
      return response.json();
    },
  });
}
```

Components don't make raw network calls—they go through the kernel's API layer, which handles auth, retries, caching, and error handling.

### 2. The Compiler Pipeline: From Source to Executable

Traditional OS compilers transform high-level code into machine code. UIGen's compiler transforms OpenAPI specs into an Intermediate Representation (IR) that the runtime executes.

**Compilation Stages:**

```
Source Code (OpenAPI YAML)
    ↓
Lexer/Parser (js-yaml)
    ↓
Reconciler (Config Merge)
    ↓
Semantic Analysis (Adapter)
    ↓
IR Generation
    ↓
Runtime Execution
```

**The Reconciler** (like a preprocessor):
```typescript
// packages/core/src/reconciler/reconciler.ts
export function reconcile(spec: OpenAPISpec, config: ConfigFile): OpenAPISpec {
  const reconciled = deepClone(spec);
  
  // Merge user config annotations into spec
  for (const [elementPath, annotations] of Object.entries(config.annotations)) {
    const element = resolveElementPath(reconciled, elementPath);
    if (element) {
      // Config takes precedence (like #define in C)
      Object.assign(element, annotations);
    }
  }
  
  return reconciled;
}
```

**The Adapter** (like a compiler frontend):
```typescript
// packages/core/src/adapter/openapi3.ts
export class OpenAPI3Adapter {
  adapt(): UIGenApp {
    // Parse and analyze the spec
    const resources = this.resourceExtractor.extractResources();
    const auth = this.authDetector.detectAuthConfig();
    
    // Generate IR
    return {
      meta: this.extractMeta(),
      resources,
      auth,
      dashboard: this.buildDashboard(),
      servers: this.extractServers(),
    };
  }
}
```

The IR is framework-agnostic JSON—like bytecode or LLVM IR. Different renderers (React, Svelte, Vue) can consume the same IR, just like different CPU architectures execute the same LLVM IR.

### 3. The Filesystem: Configuration and Asset Management

Every OS has a filesystem. UIGen's is `.uigen/`:

```
.uigen/
├── config.yaml          # System configuration (like /etc/)
├── theme.css            # User-space styling
├── assets/              # Static resources
│   └── logo.svg
└── plugins/             # Loadable modules (like /lib/)
    └── custom-auth.ts
```

**File Operations:**
```typescript
// packages/cli/src/commands/serve.ts
async function loadConfig(specPath: string): Promise<Config> {
  const configPath = path.join(path.dirname(specPath), '.uigen/config.yaml');
  
  // Filesystem read with fallback
  if (fs.existsSync(configPath)) {
    const content = await fs.promises.readFile(configPath, 'utf-8');
    return yaml.load(content) as Config;
  }
  
  return getDefaultConfig();
}
```

**Hot-Reloading** (like inotify):
The CLI watches `.uigen/` for changes and triggers recompilation:

```typescript
// File watcher (like inotify/FSEvents)
const watcher = chokidar.watch('.uigen/**/*', {
  ignored: /(^|[\/\\])\../,
  persistent: true
});

watcher.on('change', async (path) => {
  console.log(`File ${path} changed, recompiling...`);
  const newIR = await recompile();
  // Push to runtime via WebSocket
  ws.send(JSON.stringify({ type: 'IR_UPDATE', payload: newIR }));
});
```

### 4. Dynamic Linking: Loading Extensions at Runtime

Traditional OSes load shared libraries (`.so`, `.dll`) at runtime. UIGen loads custom components from `.uigen/plugins/`:

```typescript
// packages/react/src/components/fields/ComponentRegistry.tsx
export class ComponentRegistry {
  private components: Map<string, ComponentType> = new Map();
  
  // Dynamic loader (like dlopen)
  async loadPlugin(pluginPath: string) {
    const module = await import(pluginPath);
    
    if (module.register) {
      module.register(this);
    }
  }
  
  // Register custom component
  register(type: string, component: ComponentType) {
    this.components.set(type, component);
  }
  
  // Resolve component (like symbol resolution)
  resolve(type: string): ComponentType {
    return this.components.get(type) || DefaultComponent;
  }
}
```

**Plugin Example:**
```typescript
// .uigen/plugins/custom-auth.ts
export function register(registry: ComponentRegistry) {
  registry.register('auth', CustomAuthComponent);
}

export const CustomAuthComponent = ({ config }) => {
  // Custom OAuth flow
  return <OAuthProvider config={config}>...</OAuthProvider>;
};
```

The runtime discovers and loads plugins at boot—no rebuild required. This is exactly how Linux loads kernel modules or how browsers load extensions.

### 5. Memory Management: State and Caching

OSes manage memory allocation, paging, and garbage collection. UIGen's runtime manages UI state and API response caching.

**State Management** (like virtual memory):
```typescript
// packages/react/src/hooks/useResource.ts
export function useResource(resourceSlug: string) {
  // Query cache (like page cache)
  return useQuery({
    queryKey: ['resource', resourceSlug],
    queryFn: () => fetchResource(resourceSlug),
    staleTime: 5 * 60 * 1000, // 5 min TTL
    cacheTime: 30 * 60 * 1000, // 30 min in memory
  });
}
```

TanStack Query acts as a page cache—frequently accessed data stays in memory, stale data is evicted.

**Garbage Collection:**
React's reconciler handles component cleanup, but UIGen also manages API connection pooling:

```typescript
// Connection pool (like file descriptor table)
class ConnectionPool {
  private connections: Map<string, AbortController> = new Map();
  
  acquire(key: string): AbortController {
    if (!this.connections.has(key)) {
      this.connections.set(key, new AbortController());
    }
    return this.connections.get(key)!;
  }
  
  release(key: string) {
    const controller = this.connections.get(key);
    controller?.abort();
    this.connections.delete(key);
  }
}
```

### 6. Inter-Process Communication: Event Bus

OSes provide IPC mechanisms (pipes, sockets, message queues). UIGen uses an event bus for component communication:

```typescript
// packages/react/src/lib/event-bus.ts
export class EventBus {
  private listeners: Map<string, Set<Function>> = new Map();
  
  // Subscribe (like pipe read)
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  // Publish (like pipe write)
  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

// Usage
eventBus.emit('resource:created', { resource: 'users', id: 123 });
```

Components communicate through the event bus rather than direct coupling—just like processes use IPC instead of shared memory.

### 7. Device Drivers: Strategy Pattern for External Systems

OSes abstract hardware through device drivers. UIGen abstracts external systems (auth providers, file storage, payment gateways) through strategies:

```typescript
// packages/react/src/lib/oauth-strategy.ts
export interface OAuthStrategy {
  authorize(): Promise<string>;
  refresh(token: string): Promise<string>;
  revoke(token: string): Promise<void>;
}

export class GoogleOAuthStrategy implements OAuthStrategy {
  async authorize(): Promise<string> {
    // Google-specific OAuth flow
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?...`;
    return performPKCEFlow(authUrl);
  }
}

export class GitHubOAuthStrategy implements OAuthStrategy {
  async authorize(): Promise<string> {
    // GitHub-specific OAuth flow
    const authUrl = `https://github.com/login/oauth/authorize?...`;
    return performPKCEFlow(authUrl);
  }
}

// Strategy registry (like /dev/)
export class StrategyRegistry {
  private strategies: Map<string, OAuthStrategy> = new Map();
  
  register(name: string, strategy: OAuthStrategy) {
    this.strategies.set(name, strategy);
  }
  
  get(name: string): OAuthStrategy {
    return this.strategies.get(name) || new DefaultStrategy();
  }
}
```

Users can register custom strategies without modifying core code—just like writing a device driver.

### 8. System Calls: The Hook API

OSes expose system calls (`open`, `read`, `write`, `fork`). UIGen exposes hooks:

| System Call | UIGen Hook | Purpose |
|-------------|------------|---------|
| `open()` | `useResource()` | Open a resource handle |
| `read()` | `useQuery()` | Read data from API |
| `write()` | `useMutation()` | Write data to API |
| `fork()` | `useModal()` | Spawn a child UI context |
| `exec()` | `useNavigate()` | Execute a route transition |
| `getpid()` | `useParams()` | Get current route context |
| `signal()` | `useEvent()` | Send inter-component signal |

**Example:**
```typescript
// User-space code
function UserList() {
  // System calls
  const users = useResource('users');        // open + read
  const createUser = useMutation('POST:/users'); // write
  const navigate = useNavigate();            // exec
  
  return (
    <div>
      {users.data.map(user => (
        <div key={user.id} onClick={() => navigate(`/users/${user.id}`)}>
          {user.name}
        </div>
      ))}
    </div>
  );
}
```

Components never touch the network directly—they go through the kernel's system call interface.

## Why This Matters

### 1. Separation of Concerns

Like an OS separates kernel space from user space, UIGen separates:
- **Kernel space**: Routing, auth, API calls, state management
- **User space**: Components, styling, business logic

Users can't break the kernel. They extend it through well-defined interfaces.

### 2. Portability

The IR is framework-agnostic. We're building Svelte and Vue renderers that consume the same IR. This is like how POSIX programs run on Linux, macOS, and BSD—same system calls, different kernels.

### 3. Extensibility Without Rebuilds

Traditional frameworks require rebuilds when you add features. UIGen loads extensions at runtime. This is the difference between:
- **Monolithic kernel** (traditional frameworks): Rebuild to add features
- **Microkernel** (UIGen): Load modules dynamically

### 4. Declarative Configuration

OSes use config files (`/etc/fstab`, `/etc/nginx.conf`). UIGen uses `.uigen/config.yaml`. You declare what you want, the system figures out how.

### 5. Process Isolation

Components are isolated. A crash in one component doesn't bring down the system. This is like process isolation in an OS—a segfault in one process doesn't kernel panic.

## The Tradeoffs

### Runtime Overhead

Interpreting IR at runtime has overhead. But:
- The IR is small (~100KB for typical APIs)
- Parsing is fast (~50ms)
- The bottleneck is always the API, not the renderer

### Bundle Size

The runtime is ~200KB gzipped. Generated code might be smaller for simple apps. But for complex apps, the runtime amortizes—you're not duplicating CRUD logic across 50 resources.

### Debugging

Debugging interpreted systems is harder than debugging generated code. We're working on:
- Source maps from IR back to spec
- Runtime introspection tools
- Performance profiling

## What's Next

We're building:
- **Multi-tenancy**: Run multiple apps in the same runtime (like containers)
- **Sandboxing**: Isolate untrusted plugins (like seccomp)
- **Distributed rendering**: Split UI across multiple servers (like distributed OS)
- **Time-travel debugging**: Record and replay UI state (like rr debugger)

## Try It

```bash
npx @uigen-dev/cli@latest serve openapi.yaml
```

Point it at any OpenAPI spec. It boots a full UI in seconds.

The repo: [github.com/darula-hpp/uigen](https://github.com/darula-hpp/uigen)

## Conclusion

I didn't set out to build an operating system. I wanted to compile API specs into UIs. But as the system grew, it naturally evolved OS-like properties:
- A kernel managing component lifecycle
- A compiler pipeline transforming specs to IR
- A filesystem for configuration
- Dynamic linking for extensions
- Memory management for state
- IPC for component communication
- Device drivers for external systems
- System calls for user-space code

Maybe "UI Operating System" isn't just marketing. Maybe it's the most accurate description of what UIGen has become.

What do you think? Am I crazy for calling this an OS? Or is there something here?

---

**Discussion on [Hacker News](https://news.ycombinator.com) | [GitHub](https://github.com/darula-hpp/uigen) | [Docs](https://uigen.dev)**
