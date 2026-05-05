# Layout System Architecture

The UIGen layout system provides a flexible, extensible architecture for managing page structure and component arrangement. It follows the Strategy Pattern for layout implementations and the Registry Pattern for layout discovery.

## Overview

The layout system allows you to:
- Choose from multiple built-in layout strategies
- Configure layouts via OpenAPI annotations
- Create custom layout strategies
- Override layouts per resource
- Persist user layout preferences

## Architecture

### High-Level Data Flow

```
OpenAPI Spec with x-uigen-layout
           ↓
    Layout Parser (Adapter)
           ↓
  Intermediate Representation (IR)
           ↓
    Layout Registry (Renderer)
           ↓
   Layout Strategy Component
           ↓
      Rendered UI
```

### Components

#### 1. Layout Parser (Core Package)

**Location**: `packages/core/src/adapter/layout-parser.ts`

The layout parser extracts `x-uigen-layout` annotations from OpenAPI specifications and generates layout configuration objects.

**Responsibilities**:
- Parse document-level layout annotations
- Parse operation-level layout annotations
- Validate layout configuration structure
- Generate `LayoutConfig` objects for the IR

**Example**:
```typescript
const parser = new LayoutParser();
const layoutConfig = parser.parseDocumentLayout(spec);
// Returns: { type: 'sidebar', metadata: { sidebarWidth: 280 } }
```

#### 2. Intermediate Representation (Core Package)

**Location**: `packages/core/src/ir/types.ts`

The IR includes layout configuration as part of the `UIGenApp` and `Resource` interfaces.

**Key Types**:
```typescript
interface LayoutConfig {
  type: LayoutType;
  metadata?: LayoutMetadata;
}

interface UIGenApp {
  // ... other properties
  layoutConfig?: LayoutConfig;  // Global layout
}

interface Resource {
  // ... other properties
  layoutOverride?: LayoutConfig;  // Resource-specific layout
}
```

#### 3. Layout Registry (React Package)

**Location**: `packages/react/src/lib/layout-registry.ts`

The layout registry manages layout strategies using the Registry Pattern.

**Responsibilities**:
- Register layout strategies
- Retrieve strategies by type
- Provide fallback to default strategy
- Support custom strategy registration

**Example**:
```typescript
const registry = LayoutRegistry.getInstance();
registry.register(new SidebarLayoutStrategy());
registry.register(new CenteredLayoutStrategy());
registry.setDefault('sidebar');

const strategy = registry.get('centered');
```

#### 4. Layout Strategy Interface

**Location**: `packages/react/src/lib/layout-registry.ts`

All layout strategies implement the `LayoutStrategy` interface.

**Interface**:
```typescript
interface LayoutStrategy {
  type: LayoutType;
  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode;
  validate(metadata?: LayoutMetadata): boolean;
  getDefaults(): LayoutMetadata;
}
```

**Methods**:
- `render()`: Renders the layout with children
- `validate()`: Validates metadata for this strategy
- `getDefaults()`: Returns default metadata values

#### 5. Built-in Layout Strategies

**Sidebar Layout**
- **Location**: `packages/react/src/components/layout/strategies/SidebarLayoutStrategy.tsx`
- **Features**: Collapsible sidebar, top bar, breadcrumb, main content
- **Use Case**: Admin dashboards, data management

**Centered Layout**
- **Location**: `packages/react/src/components/layout/strategies/CenteredLayoutStrategy.tsx`
- **Features**: Centered container, optional header, vertical centering
- **Use Case**: Auth pages, focused forms

**Dashboard Grid Layout**
- **Location**: `packages/react/src/components/layout/strategies/DashboardGridLayoutStrategy.tsx`
- **Features**: Responsive grid, sidebar, top bar
- **Use Case**: Dashboard widgets, card layouts

#### 6. Layout Container

**Location**: `packages/react/src/components/layout/LayoutContainer.tsx`

The layout container resolves and applies layout strategies.

**Responsibilities**:
- Resolve strategy from registry
- Merge metadata with defaults
- Validate metadata
- Render children within strategy
- Handle errors with error boundary

**Example**:
```typescript
<LayoutContainer layoutConfig={{ type: 'sidebar' }}>
  <YourContent />
</LayoutContainer>
```

## Design Patterns

### Strategy Pattern

The layout system uses the Strategy Pattern to encapsulate layout algorithms:

- **Context**: `LayoutContainer` component
- **Strategy Interface**: `LayoutStrategy` interface
- **Concrete Strategies**: `SidebarLayoutStrategy`, `CenteredLayoutStrategy`, `DashboardGridLayoutStrategy`

**Benefits**:
- Easy to add new layouts without modifying existing code
- Layouts can be swapped at runtime
- Each layout is independently testable

### Registry Pattern

The layout registry uses the Registry Pattern for strategy discovery:

- **Registry**: `LayoutRegistry` singleton
- **Registered Objects**: Layout strategy instances
- **Key**: Layout type string

**Benefits**:
- Centralized strategy management
- Support for custom strategies
- Fallback to default strategy

## Data Flow Example

### 1. OpenAPI Spec

```yaml
openapi: 3.0.0
x-uigen-layout:
  type: sidebar
  metadata:
    sidebarWidth: 280

paths:
  /auth/login:
    post:
      x-uigen-layout:
        type: centered
```

### 2. Adapter Parsing

```typescript
// Layout parser extracts annotations
const globalLayout = parser.parseDocumentLayout(spec);
// { type: 'sidebar', metadata: { sidebarWidth: 280 } }

const loginLayout = parser.parseOperationLayout(loginOp);
// { type: 'centered' }
```

### 3. IR Generation

```typescript
const uigenApp: UIGenApp = {
  layoutConfig: { type: 'sidebar', metadata: { sidebarWidth: 280 } },
  resources: [
    {
      name: 'Auth',
      layoutOverride: { type: 'centered' }
    }
  ]
};
```

### 4. Renderer Application

```typescript
// App.tsx determines layout for current route
const layoutConfig = isAuthRoute 
  ? resource.layoutOverride 
  : config.layoutConfig;

// LayoutContainer resolves and applies strategy
<LayoutContainer layoutConfig={layoutConfig}>
  <LoginView />
</LayoutContainer>
```

## Extensibility

### Creating Custom Layouts

You can create custom layout strategies by implementing the `LayoutStrategy` interface:

```typescript
class MyCustomLayoutStrategy implements LayoutStrategy {
  type = 'my-custom-layout' as const;
  
  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode {
    return (
      <div className="my-custom-layout">
        {/* Your custom layout structure */}
        {children}
      </div>
    );
  }
  
  validate(metadata?: LayoutMetadata): boolean {
    // Validate your custom metadata
    return true;
  }
  
  getDefaults(): LayoutMetadata {
    return {
      // Your default metadata
    };
  }
}
```

### Registering Custom Layouts

Register your custom layout before the app initializes:

```typescript
import { LayoutRegistry } from '@uigen-dev/react';
import { MyCustomLayoutStrategy } from './MyCustomLayoutStrategy';

const registry = LayoutRegistry.getInstance();
registry.register(new MyCustomLayoutStrategy());
```

See [Custom Layout Strategies](/docs/extending-uigen/custom-layouts) for a complete guide.

## Performance Optimizations

The layout system includes several performance optimizations:

1. **React.memo**: Layout components are memoized to prevent unnecessary re-renders
2. **CSS Variables**: Used instead of inline styles to avoid layout recalculation
3. **useMemo**: Expensive computations are memoized
4. **CSS Transforms**: Animations use transforms instead of layout-triggering properties
5. **Debounced Handlers**: Resize handlers are debounced to reduce computation

## Accessibility Features

All layouts include accessibility features:

- **Semantic HTML**: `<nav>`, `<main>`, `<header>`, `<aside>` elements
- **ARIA Landmarks**: `role="navigation"`, `role="main"`, `role="banner"`
- **ARIA Labels**: Descriptive labels for interactive elements
- **Keyboard Navigation**: Full keyboard support (Enter, Space, Escape)
- **Focus Management**: Proper focus handling during layout changes
- **Screen Reader Announcements**: ARIA live regions for dynamic changes

## User Preferences

Layout preferences are automatically persisted:

- **Storage**: localStorage
- **Scope**: Per application (using app title as key)
- **Preferences**: Sidebar collapse state, selected layout type
- **Restoration**: Automatic on page load

**Example**:
```typescript
// Preferences are saved automatically
const prefs = loadLayoutPreferences('My App');
// { sidebarCollapsed: true }

// Update preferences
updateLayoutPreferences('My App', { sidebarCollapsed: false });
```

## Error Handling

The layout system includes robust error handling:

1. **Invalid Metadata**: Logs warning and uses defaults
2. **Unregistered Strategy**: Falls back to default strategy
3. **Strategy Errors**: Error boundary catches and displays fallback UI
4. **Malformed Annotations**: Parser logs warning and skips annotation

## Testing

The layout system is thoroughly tested:

- **Unit Tests**: Each component and strategy
- **Integration Tests**: LayoutContainer with strategies
- **Property-Based Tests**: Universal correctness properties
- **Accessibility Tests**: ARIA attributes and keyboard navigation

## See Also

- [x-uigen-layout Annotation Reference](/docs/spec-annotations/x-uigen-layout)
- [Custom Layout Strategies Guide](/docs/extending-uigen/custom-layouts)
- [Layout Migration Guide](/docs/getting-started/layout-migration)
