# Serve Command Refactoring

## Problem
The `serve.ts` file had grown to ~700 lines with multiple responsibilities, making it difficult to maintain and test.

## Solution
Refactored using **Strategy Pattern** and **Single Responsibility Principle** to create a clean, modular architecture.

## New Structure

```
packages/cli/src/
├── commands/
│   └── serve.ts (80 lines - orchestration only)
└── server/
    ├── index.ts (exports)
    ├── types.ts (shared types)
    ├── spec-processor.ts (spec loading & reconciliation)
    ├── asset-loader.ts (CSS & overrides)
    ├── proxy-manager.ts (auth headers & proxy)
    ├── dev-server-strategy.ts (Vite dev server)
    └── static-server-strategy.ts (production server)
```

## Design Patterns Applied

### 1. Strategy Pattern
**Problem**: Different server modes (dev vs production) with different behaviors  
**Solution**: `ServerStrategy` interface with two implementations

```typescript
interface ServerStrategy {
  start(context: ServerContext, options: ServeOptions): Promise<void>;
}

// Implementations:
- DevServerStrategy (Vite + hot reload)
- StaticServerStrategy (HTTP server + static files)
```

### 2. Single Responsibility Principle
Each module has one clear responsibility:

- **SpecProcessor**: Load, parse, reconcile OpenAPI specs
- **AssetLoader**: Handle CSS and override files
- **ProxyManager**: Manage auth headers and proxy configuration
- **DevServerStrategy**: Run Vite dev server with hot reload
- **StaticServerStrategy**: Run production static server

### 3. Dependency Injection
Context object passed to strategies contains all dependencies:

```typescript
interface ServerContext {
  specDir: string;
  ir: UIGenApp;
  proxyTarget: string;
  cssContent: string;
  overrideScript: string;
  verbose: boolean;
}
```

## Benefits

### ✅ Maintainability
- Each file is <200 lines
- Clear separation of concerns
- Easy to locate and fix bugs

### ✅ Testability
- Each module can be tested in isolation
- Mock dependencies easily
- Strategy pattern enables testing different server modes

### ✅ Extensibility
- Add new server strategies without modifying existing code
- Add new asset loaders (e.g., SCSS, LESS)
- Add new spec processors (e.g., AsyncAPI)

### ✅ Readability
- `serve.ts` is now a simple orchestrator
- Each module has a clear, focused purpose
- Type definitions centralized in `types.ts`

## Migration Path

### Before (God File)
```typescript
// serve.ts - 700 lines
- resolveRendererRoot()
- loadCSS()
- setupOverrideWatcher()
- processOverrides()
- injectAuthHeaders()
- serve() with inline Vite setup
- serve() with inline HTTP server setup
```

### After (Modular)
```typescript
// serve.ts - 80 lines
export async function serve(specPath: string, options: ServeOptions) {
  const specProcessor = new SpecProcessor();
  const { ir, specDir } = await specProcessor.process({ specPath, verbose });
  
  const assetLoader = new AssetLoader();
  const cssContent = assetLoader.loadCSS(specDir, verbose);
  const overrideScript = await assetLoader.processOverrides(specDir, mode, verbose);
  
  const context = { specDir, ir, proxyTarget, cssContent, overrideScript, verbose };
  const strategy = isInstalled ? new StaticServerStrategy() : new DevServerStrategy();
  
  await strategy.start(context, options);
}
```

## Future Improvements

1. **Add tests** for each module
2. **Extract renderer resolution** to separate module
3. **Add server lifecycle hooks** (onStart, onStop, onError)
4. **Add plugin system** for custom middleware
5. **Add configuration validation** module

## Backward Compatibility

✅ **No breaking changes** - the public API (`serve(specPath, options)`) remains unchanged.

All existing functionality preserved:
- Hot reload for overrides
- CSS injection
- Proxy configuration
- Auth header injection
- Static and dev modes

