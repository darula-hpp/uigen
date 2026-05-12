# UIGen Override System

The UIGen override system allows you to customize any view in your generated application by placing TypeScript/TSX files in the `src/overrides/` directory.

## Current Overrides

### Profile Page Override (`profile-complete.tsx`)

A complete custom profile page with:
- Modern card-based layout using theme CSS variables
- Amber/orange theme matching the app's color scheme
- Avatar display with user initials
- Inline editing with form validation
- Success/error message handling
- Loading and error states
- User statistics (status, user ID, days active)
- Responsive design with mobile support
- Scoped CSS classes for styling

**Target**: Profile page (`me` resource)
**Mode**: Complete component replacement
**Styling**: Uses CSS variables from `.uigen/theme.css`
**Annotation**: Uses `x-uigen-override` in config.yaml to enable the override

---

## How It Works

1. **Annotate in Config**: Add `x-uigen-override` annotation to your OpenAPI spec via config.yaml
2. **Create Override Files**: Place `.ts` or `.tsx` files in `src/overrides/`
3. **CLI Discovery**: The CLI automatically discovers your override files
4. **Transpilation**: Files are transpiled using esbuild and bundled
5. **Injection**: The bundled code is injected into your app via `window.__UIGEN_OVERRIDES__`
6. **Registration**: The SPA reads and registers your overrides on startup
7. **Reconciliation**: The SPA checks `x-uigen-override` metadata to apply overrides

## Override Modes

UIGen supports three override modes with different levels of control:

### 1. Component Mode (Full Control)

**Use when**: You need complete control over data fetching, state, and rendering.

```tsx
import type { OverrideDefinition, OverrideComponentProps } from '@uigen-dev/react';

function CustomComponent({ resource, operation }: OverrideComponentProps) {
  // Your custom component with full control
  return <div>Custom View</div>;
}

const override: OverrideDefinition = {
  targetId: 'users.list',
  component: CustomComponent,
};

export default override;
```

**You control**:
- Data fetching
- State management
- Routing
- Authentication
- Everything!

**Example**: `profile-complete.tsx`

### 2. Render Mode (Custom UI, UIGen Data)

**Use when**: You want custom UI but UIGen should handle data fetching.

```tsx
import type { OverrideDefinition, DetailRenderProps } from '@uigen-dev/react';

function renderCustomView(props: DetailRenderProps<YourDataType>) {
  const { data, isLoading, error } = props;
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  // Your custom rendering
  return <div>{data.title}</div>;
}

const override: OverrideDefinition<YourDataType> = {
  targetId: 'users.detail',
  render: renderCustomView,
};

export default override;
```

**UIGen provides**:
- `data`: Fetched data
- `isLoading`: Loading state
- `error`: Error state
- `resource`: Resource metadata
- `operation`: Operation metadata

**You control**:
- Rendering logic
- UI components
- Layout

### 3. UseHooks Mode (Side Effects Only)

**Use when**: You want to add side effects without changing the UI.

```tsx
import { useEffect } from 'react';
import type { OverrideDefinition, OverrideHookProps } from '@uigen-dev/react';

function useCustomHooks({ resource, operation }: OverrideHookProps) {
  useEffect(() => {
    // Analytics tracking
    console.log('View loaded:', resource.name);
  }, [resource]);
  
  // Return custom data (optional)
  return { customData: 'value' };
}

const override: OverrideDefinition = {
  targetId: 'users.create',
  useHooks: useCustomHooks,
};

export default override;
```

**Perfect for**:
- Analytics tracking
- Document title updates
- WebSocket subscriptions
- Auto-save functionality
- Third-party integrations

## Enabling Overrides with x-uigen-override

To enable an override, you must add the `x-uigen-override` annotation to your OpenAPI specification via the `.uigen/config.yaml` file:

```yaml
# .uigen/config.yaml
/api/v1/auth/me:
  x-uigen-override:
    id: me              # Matches targetId in override file
    enabled: true       # Optional, defaults to true
```

The `x-uigen-override` annotation has two properties:
- **id** (required): Stable identifier that matches the `targetId` in your override file
- **enabled** (optional): Boolean flag to enable/disable the override (defaults to `true`)

### Disabling Overrides

You can temporarily disable an override without removing the annotation or override file:

```yaml
/api/v1/auth/me:
  x-uigen-override:
    id: me
    enabled: false      # Override is disabled
```

This is useful for:
- Testing the generated UI without removing your custom code
- Temporarily reverting to default behavior
- A/B testing between custom and generated UIs

## Target IDs

Target IDs identify which view to override. They must match the `id` value in your `x-uigen-override` annotation.

Common patterns:
- **Resource**: `users` (overrides all user views)
- **Resource + Operation**: `users.list` (overrides user list view)
- **Specific Operation**: `users.detail` (overrides user detail view)

Common operation suffixes:
- `.list` - List view
- `.detail` - Detail view
- `.create` - Create form
- `.update` - Edit form
- `.delete` - Delete confirmation

## Development Workflow

### 1. Add Annotation to Config

```yaml
# .uigen/config.yaml
/api/v1/my-resource:
  x-uigen-override:
    id: my-resource.list
    enabled: true
```

### 2. Create Override File

```bash
# Create a new override file
touch src/overrides/my-custom-view.tsx
```

### 3. Define Override

```tsx
import type { OverrideDefinition } from '@uigen-dev/react';

const override: OverrideDefinition = {
  targetId: 'my-resource.list',  // Must match id in x-uigen-override
  component: MyCustomComponent,
};

export default override;
```

### 4. Start Dev Server

```bash
uigen serve openapi.yaml
```

The CLI will:
- Discover your override files
- Transpile them using esbuild
- Inject them into the app
- Enable hot reload for fast iteration

### 5. Edit and Reload

Edit your override file and save. The browser will automatically reload with your changes.

## Best Practices

### 1. One Override Per File

```tsx
// ✅ Good: One override per file
const override: OverrideDefinition = {
  targetId: 'users.list',
  component: UsersListComponent,
};

export default override;
```

### 2. Use TypeScript Types

```tsx
// ✅ Good: Type your data
interface User {
  id: string;
  name: string;
  email: string;
}

const override: OverrideDefinition<User> = {
  targetId: 'users.detail',
  render: (props: DetailRenderProps<User>) => {
    // props.data is typed as User
    return <div>{props.data.name}</div>;
  },
};
```

### 3. Handle Loading and Error States

```tsx
// ✅ Good: Handle all states
function renderUser(props: DetailRenderProps<User>) {
  if (props.isLoading) return <LoadingSpinner />;
  if (props.error) return <ErrorMessage error={props.error} />;
  if (!props.data) return <NotFound />;
  
  return <UserDetails user={props.data} />;
}
```

### 4. Use Descriptive File Names

```tsx
// ✅ Good: Clear file names
src/overrides/users-list-component.tsx
src/overrides/meetings-detail-render.tsx
src/overrides/analytics-hooks.tsx

// ❌ Bad: Unclear file names
src/overrides/override1.tsx
src/overrides/custom.tsx
src/overrides/test.tsx
```

## Troubleshooting

### Override Not Working

1. **Check annotation**: Make sure `x-uigen-override` is present in config.yaml with correct `id`
2. **Check enabled flag**: Ensure `enabled: true` (or omit for default true)
3. **Check target ID**: Make sure override file's `targetId` matches the `id` in `x-uigen-override`
4. **Check file location**: Must be in `src/overrides/`
5. **Check export**: Must have `export default override`
6. **Check console**: Look for error messages or warnings about missing overrides
7. **Check verbose logs**: Run with `--verbose` flag

### TypeScript Errors

1. **Install types**: `npm install @uigen-dev/react`
2. **Check imports**: Import types from `@uigen-dev/react`
3. **Check tsconfig**: Ensure `jsx: "react-jsx"` is set

## Learn More

- [UIGen Documentation](https://uigen.dev/docs)
- [Override System Design](/.kiro/specs/cli-injected-override-system/design.md)
- [API Reference](https://uigen.dev/docs/api/overrides)

## Support

- GitHub Issues: https://github.com/uigen-dev/uigen/issues
- Discord: https://discord.gg/uigen
- Email: support@uigen.dev
