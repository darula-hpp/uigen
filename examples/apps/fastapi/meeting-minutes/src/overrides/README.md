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

---

## How It Works

1. **Create Override Files**: Place `.ts` or `.tsx` files in `src/overrides/`
2. **CLI Discovery**: The CLI automatically discovers your override files
3. **Transpilation**: Files are transpiled using esbuild and bundled
4. **Injection**: The bundled code is injected into your app via `window.__UIGEN_OVERRIDES__`
5. **Registration**: The SPA reads and registers your overrides on startup

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

## Target IDs

Target IDs identify which view to override. They follow this pattern:

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

### 1. Create Override File

```bash
# Create a new override file
touch src/overrides/my-custom-view.tsx
```

### 2. Define Override

```tsx
import type { OverrideDefinition } from '@uigen-dev/react';

const override: OverrideDefinition = {
  targetId: 'my-resource.list',
  component: MyCustomComponent,
};

export default override;
```

### 3. Start Dev Server

```bash
uigen serve openapi.yaml
```

The CLI will:
- Discover your override files
- Transpile them using esbuild
- Inject them into the app
- Enable hot reload for fast iteration

### 4. Edit and Reload

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

1. **Check target ID**: Make sure it matches the resource/operation ID (check with `x-uigen-id` in config.yaml)
2. **Check file location**: Must be in `src/overrides/`
3. **Check export**: Must have `export default override`
4. **Check console**: Look for error messages
5. **Check verbose logs**: Run with `--verbose` flag

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
