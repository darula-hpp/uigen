# UIGen Overrides

This directory is for customizing UIGen views using the override system.

## Quick Start

1. **Create an override file** (e.g., `users-list.tsx`)
2. **Define your override** with a `targetId` and override mode
3. **Run `uigen serve`** - your overrides are automatically discovered and injected
4. **Edit and save** - hot reload updates your changes instantly

## Example Override

```tsx
import type { OverrideDefinition, OverrideComponentProps } from '@uigen-dev/react';

function CustomUsersList({ resource, operation }: OverrideComponentProps) {
  return (
    <div>
      <h1>My Custom Users List</h1>
      {/* Your custom implementation */}
    </div>
  );
}

const override: OverrideDefinition = {
  targetId: 'users.list',
  component: CustomUsersList,
};

export default override;
```

## Override Modes

### 1. Component Mode (Full Control)
Complete control over data fetching, state, and rendering.

```tsx
const override: OverrideDefinition = {
  targetId: 'users.list',
  component: MyComponent,
};
```

### 2. Render Mode (Custom UI)
UIGen handles data fetching, you control rendering.

```tsx
const override: OverrideDefinition = {
  targetId: 'users.detail',
  render: (props) => {
    const { data, isLoading, error } = props;
    return <div>{data.name}</div>;
  },
};
```

### 3. UseHooks Mode (Side Effects)
Add side effects without changing the UI.

```tsx
const override: OverrideDefinition = {
  targetId: 'users.create',
  useHooks: ({ resource }) => {
    useEffect(() => {
      console.log('Form viewed:', resource.name);
    }, []);
  },
};
```

## Target IDs

Target IDs identify which view to override:

- `users` - All user views
- `users.list` - User list view
- `users.detail` - User detail view
- `users.create` - User create form
- `users.update` - User edit form

## TypeScript Support

Full autocomplete and type checking:

```tsx
import type {
  OverrideDefinition,
  OverrideComponentProps,
  DetailRenderProps,
  ListRenderProps,
} from '@uigen-dev/react';
```

## Learn More

- [Override System Documentation](https://getuigen.dev/docs/overrides)
- [API Reference](https://getuigen.dev/docs/api/overrides)
- [Examples](https://github.com/uigen-dev/uigen/tree/main/examples)

## Need Help?

- GitHub Issues: https://github.com/uigen-dev/uigen/issues
- Discord: https://discord.gg/uigen
