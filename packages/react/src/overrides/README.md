# UIGen Override System

The override system lets you selectively customize specific views in your UIGen-generated UI while keeping everything else auto-generated. You opt in per view — no changes needed to views you don't touch.

---

## Mental Model

UIGen generates a complete UI from your OpenAPI spec. The override system gives you escape hatches at three levels of control:

| Mode | You control | UIGen controls |
|------|-------------|----------------|
| `component` | Everything — data fetching, rendering, routing | Nothing |
| `render` | How data is displayed | Data fetching, loading/error states |
| `useHooks` | Side effects only | Everything visible |

---

## Addressing Scheme

Every view has a stable `uigenId` you use to target it:

```
{resource.uigenId}.{view}
```

| View | uigenId example |
|------|----------------|
| List | `users.list` |
| Detail | `users.detail` |
| Create form | `users.create` |
| Edit form | `users.edit` |
| Search | `users.search` |

The `resource.uigenId` comes from the `x-uigen-id` vendor extension in your spec, or falls back to the resource slug.

---

## Usage

Register overrides before your app renders:

```typescript
import { overrideRegistry } from '@uigen-dev/react';

// Register before React renders
overrideRegistry.register({
  targetId: 'users.list',
  component: MyCustomUserList,
});
```

---

## Override Modes

### Component Mode (Full Ownership)

You own everything — data fetching, rendering, routing. UIGen renders your component instead of the built-in view.

```typescript
import type { OverrideComponentProps } from '@uigen-dev/react';

function CustomUserList({ resource }: OverrideComponentProps) {
  // You handle data fetching
  const { data } = useQuery(['users'], fetchUsers);

  return (
    <div>
      <h1>My Custom User List</h1>
      {data?.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}

overrideRegistry.register({
  targetId: 'users.list',
  component: CustomUserList,
});
```

**Use when:** You need full control over data fetching, custom routing, or a completely different layout.

### Render Mode (Custom Display)

UIGen fetches the data; you control how it's displayed. Your render function receives the fetched data as props.

```typescript
import type { ListRenderProps } from '@uigen-dev/react';

overrideRegistry.register({
  targetId: 'users.list',
  render: ({ resource, data, isLoading, error, pagination }: ListRenderProps) => {
    if (isLoading) return <Spinner />;
    if (error) return <ErrorMessage error={error} />;

    return (
      <div className="card-grid">
        {data?.map(user => (
          <UserCard key={user.id} user={user} />
        ))}
        <Pagination {...pagination} />
      </div>
    );
  },
});
```

**Use when:** You want a different visual layout but don't want to re-implement data fetching.

### UseHooks Mode (Side Effects Only)

UIGen renders the built-in view normally; your hook runs alongside it for side effects like analytics, title updates, or subscriptions.

```typescript
import { useEffect } from 'react';

overrideRegistry.register({
  targetId: 'users.list',
  useHooks: ({ resource }) => {
    useEffect(() => {
      document.title = `${resource.name} — My App`;
      analytics.track('page_view', { resource: resource.uigenId });
    }, [resource.uigenId]);
  },
});
```

**Use when:** You need side effects without changing the UI.

---

## Priority Rules

When multiple mode fields are defined on a single override, the priority is:

```
component > render > useHooks
```

Only the highest-priority mode is used.

---

## Render Props Reference

### ListRenderProps

```typescript
interface ListRenderProps<TData = any[]> {
  resource: Resource;
  operation: Operation;
  data: TData | undefined;
  isLoading: boolean;
  error: Error | null;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages?: number;
    goToPage: (page: number) => void;
    nextPage: () => void;
    previousPage: () => void;
  };
}
```

### DetailRenderProps

```typescript
interface DetailRenderProps<TData = Record<string, unknown>> {
  resource: Resource;
  operation: Operation;
  data: TData | undefined;
  isLoading: boolean;
  error: Error | null;
}
```

### FormRenderProps

```typescript
interface FormRenderProps<TData = Record<string, unknown>> {
  resource: Resource;
  operation: Operation;
  mode: 'create' | 'edit';
  data: TData | undefined;
  isLoading: boolean;
  error: Error | null;
  formMethods: {
    register: UseFormRegister<any>;
    handleSubmit: UseFormHandleSubmit<any>;
    errors: FieldErrors;
    isSubmitting: boolean;
  };
}
```

### SearchRenderProps

```typescript
interface SearchRenderProps<TData = any[]> {
  resource: Resource;
  operation?: Operation;
  data: TData | undefined;
  isLoading: boolean;
  error: Error | null;
  filters: Record<string, string>;
  setFilters: (filters: Record<string, string>) => void;
  clearFilters: () => void;
}
```

### WizardRenderProps

```typescript
interface WizardRenderProps<TData = Record<string, unknown>> {
  resource: Resource;
  operation?: Operation;
  data: TData | undefined;
  isLoading: boolean;
  error: Error | null;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}
```

---

## TypeScript Support

All override definitions are fully typed. Use the generic type parameter for typed data:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

overrideRegistry.register({
  targetId: 'users.list',
  render: ({ data }: ListRenderProps<User[]>) => {
    // data is typed as User[] | undefined
    return <>{data?.map(u => <span key={u.id}>{u.email}</span>)}</>;
  },
});
```

---

## Composability

You can wrap or extend built-in views from within render mode:

```typescript
import { ListView } from '@uigen-dev/react';

overrideRegistry.register({
  targetId: 'users.list',
  render: (props) => (
    <div>
      <Banner message="Custom header above the table" />
      {/* Render the built-in list view inside your custom layout */}
      <ListView resource={props.resource} />
    </div>
  ),
});
```

---

## useOverrideData Hook

When using `useHooks` mode, the return value is stored in context and accessible to child components via `useOverrideData`:

```typescript
import { useOverrideData } from '@uigen-dev/react';

function ChildComponent() {
  const data = useOverrideData();
  // Access data returned from useHooks
  return <div>{data.analyticsId}</div>;
}
```

---

## Error Handling

The override system never crashes your application:

- **Component errors** — caught by an `ErrorBoundary`, shows a fallback UI
- **Render function errors** — caught with try/catch, falls back to the built-in view
- **useHooks errors** — caught with try/catch, built-in view renders normally

All errors are logged to the console with the `targetId` for easy debugging.

---

## Backward Compatibility

The override system is fully opt-in. Existing UIGen apps work unchanged — no overrides registered means no behavior change.

---

## API Reference

```typescript
// Register an override
overrideRegistry.register(def: OverrideDefinition): void

// Check if an override exists
overrideRegistry.has(uigenId: string): boolean

// Get an override definition
overrideRegistry.get(uigenId: string): OverrideDefinition | undefined

// Remove all overrides (useful in tests)
overrideRegistry.clear(): void

// Determine which mode applies to a view
reconcile(uigenId: string): ReconcileResult
```
