# Skill: Create UIGen Overrides

## Overview
This skill guides AI agents through creating custom overrides for UIGen-generated applications. Overrides allow developers to customize any view in their generated application by replacing or enhancing the default UI with custom React components.

## Critical Understanding

### What This Skill Does
Helps AI agents create custom overrides for UIGen views:
- Creates override files in the correct location (`src/overrides/`)
- Configures `x-uigen-override` annotations in `.uigen/config.yaml`
- Implements component mode, render mode, or hooks mode overrides
- Tests overrides with `uigen serve`
- Handles TypeScript types and imports correctly
- Follows UIGen override system conventions

### When to Use This Skill
- User wants to customize a specific view (profile, list, detail, form, etc.)
- User needs custom data fetching or state management
- User wants to add analytics, tracking, or side effects
- User wants to replace the default UI with a custom design
- User needs to integrate third-party libraries or components

### When NOT to Use This Skill
- For simple styling changes → Use `.uigen/theme.css` instead
- For configuration changes → Use `.uigen/config.yaml` annotations
- For OAuth setup → Use `SKILLS/configure-oauth.md`
- For landing pages → Use `SKILLS/generate-landing-page-content.md`

## The Override System Architecture

### How Overrides Work

1. **Annotation**: Add `x-uigen-override` to `.uigen/config.yaml`
2. **Discovery**: CLI discovers override files in `src/overrides/`
3. **Transpilation**: Files are transpiled using esbuild
4. **Injection**: Bundled code is injected via `window.__UIGEN_OVERRIDES__`
5. **Registration**: SPA registers overrides on startup
6. **Reconciliation**: SPA checks annotations and applies overrides

### File Structure

```
your-project/
├── .uigen/
│   ├── config.yaml          # Contains x-uigen-override annotations
│   └── theme.css            # Global styles
├── src/
│   └── overrides/           # Override files go here
│       ├── profile-custom.tsx
│       ├── users-list.tsx
│       └── meetings-detail.tsx
└── openapi.yaml             # Your OpenAPI spec
```

## Override Modes

UIGen supports three override modes with different levels of control:

### 1. Component Mode (Full Control)

**Use when**: You need complete control over data fetching, state, and rendering.

**What you control**:
- Data fetching
- State management
- Routing
- Authentication
- Everything!

**Example**:
```tsx
import type { OverrideDefinition, OverrideComponentProps } from '@uigen-dev/react';
import { useState, useEffect } from 'react';

function CustomProfileView({ resource, operation }: OverrideComponentProps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Custom data fetching
    fetch('/api/v1/auth/me')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="custom-profile">
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}

const override: OverrideDefinition = {
  targetId: 'me',
  component: CustomProfileView,
};

export default override;
```

### 2. Render Mode (Custom UI, UIGen Data)

**Use when**: You want custom UI but UIGen should handle data fetching.

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

**Example**:
```tsx
import type { OverrideDefinition, DetailRenderProps } from '@uigen-dev/react';

interface User {
  id: string;
  name: string;
  email: string;
}

function renderUserDetail(props: DetailRenderProps<User>) {
  const { data, isLoading, error } = props;
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>Not found</div>;
  
  return (
    <div className="user-detail">
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}

const override: OverrideDefinition<User> = {
  targetId: 'users.detail',
  render: renderUserDetail,
};

export default override;
```

### 3. UseHooks Mode (Side Effects Only)

**Use when**: You want to add side effects without changing the UI.

**Perfect for**:
- Analytics tracking
- Document title updates
- WebSocket subscriptions
- Auto-save functionality
- Third-party integrations

**Example**:
```tsx
import { useEffect } from 'react';
import type { OverrideDefinition, OverrideHookProps } from '@uigen-dev/react';

function useAnalyticsTracking({ resource, operation }: OverrideHookProps) {
  useEffect(() => {
    // Track page view
    console.log('View loaded:', resource.name);
    
    // Send to analytics service
    window.analytics?.track('page_view', {
      resource: resource.name,
      operation: operation?.method,
    });
  }, [resource, operation]);
  
  // Optional: Return custom data
  return { trackedAt: new Date() };
}

const override: OverrideDefinition = {
  targetId: 'users.list',
  useHooks: useAnalyticsTracking,
};

export default override;
```

## AI Agent Workflow

### Step 1: Understand the Requirement

Ask clarifying questions:
- Which view needs to be customized? (profile, list, detail, form, etc.)
- What level of customization is needed? (full control, UI only, side effects only)
- What data needs to be displayed or fetched?
- Are there any specific design requirements?

### Step 2: Identify the Target ID

Target IDs identify which view to override. Common patterns:

**Resource-level**:
- `users` - Overrides all user views
- `posts` - Overrides all post views
- `meetings` - Overrides all meeting views

**Operation-level**:
- `users.list` - User list view
- `users.detail` - User detail view
- `users.create` - User create form
- `users.update` - User edit form
- `posts.detail` - Post detail view

**Special cases**:
- `me` - Profile page (common for `/auth/me` endpoints)
- `dashboard` - Dashboard view
- `analytics` - Analytics view

### Step 3: Add x-uigen-override Annotation

Edit `.uigen/config.yaml` to add the annotation:

```yaml
# .uigen/config.yaml
version: '1.0'
enabled: {}
defaults: {}
annotations:
  # Add annotation for the target operation
  GET:/api/v1/auth/me:
    x-uigen-override:
      id: me              # Stable identifier
      enabled: true       # Optional, defaults to true
    x-uigen-profile: true # Other annotations can coexist
    x-uigen-label: My Profile
```

**Annotation structure**:
- `id` (required): Stable identifier matching `targetId` in override file
- `enabled` (optional): Boolean to enable/disable override (defaults to `true`)

### Step 4: Create Override File

Create a new file in `src/overrides/` with a descriptive name:

```bash
# Create overrides directory if it doesn't exist
mkdir -p src/overrides

# Create override file
touch src/overrides/profile-custom.tsx
```

**File naming conventions**:
- Use descriptive names: `profile-custom.tsx`, `users-list.tsx`, `meetings-detail.tsx`
- Use kebab-case: `my-custom-view.tsx`
- Avoid generic names: `override1.tsx`, `custom.tsx`, `test.tsx`

### Step 5: Implement the Override

Choose the appropriate mode and implement:

**Component Mode Template**:
```tsx
import type { OverrideDefinition, OverrideComponentProps } from '@uigen-dev/react';

function CustomComponent({ resource, operation }: OverrideComponentProps) {
  // Your implementation
  return <div>Custom View</div>;
}

const override: OverrideDefinition = {
  targetId: 'your-target-id',
  component: CustomComponent,
};

export default override;
```

**Render Mode Template**:
```tsx
import type { OverrideDefinition, DetailRenderProps } from '@uigen-dev/react';

interface YourDataType {
  // Define your data structure
}

function renderCustomView(props: DetailRenderProps<YourDataType>) {
  const { data, isLoading, error } = props;
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{/* Your UI */}</div>;
}

const override: OverrideDefinition<YourDataType> = {
  targetId: 'your-target-id',
  render: renderCustomView,
};

export default override;
```

**UseHooks Mode Template**:
```tsx
import { useEffect } from 'react';
import type { OverrideDefinition, OverrideHookProps } from '@uigen-dev/react';

function useCustomHooks({ resource, operation }: OverrideHookProps) {
  useEffect(() => {
    // Your side effects
  }, [resource]);
}

const override: OverrideDefinition = {
  targetId: 'your-target-id',
  useHooks: useCustomHooks,
};

export default override;
```

### Step 6: Test the Override

Start the development server:

```bash
uigen serve openapi.yaml
```

The CLI will:
- Discover your override files
- Transpile them using esbuild
- Inject them into the app
- Enable hot reload for fast iteration

Navigate to the view in your browser and verify the override is working.

### Step 7: Iterate and Refine

Edit your override file and save. The browser will automatically reload with your changes.

## Common Use Cases

### Use Case 1: Custom Profile Page

**Requirement**: Replace the default profile page with a custom design.

**Solution**: Component mode override

```tsx
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
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetch('/api/v1/auth/me', {
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
      })
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return <div>Profile not found</div>;
  }
  
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Username</label>
            <p className="text-lg">{profile.username}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="text-lg">{profile.email}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Member Since</label>
            <p className="text-lg">{new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
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

**Config annotation**:
```yaml
GET:/api/v1/auth/me:
  x-uigen-override:
    id: me
    enabled: true
```

### Use Case 2: Custom List View with Filtering

**Requirement**: Add custom filtering to a list view.

**Solution**: Render mode override

```tsx
import type { OverrideDefinition, ListRenderProps } from '@uigen-dev/react';
import { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

function renderUsersList(props: ListRenderProps<User[]>) {
  const { data, isLoading, error, pagination } = props;
  const [filter, setFilter] = useState('');
  
  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No users found</div>;
  
  const filteredUsers = data.filter(user =>
    user.name.toLowerCase().includes(filter.toLowerCase()) ||
    user.email.toLowerCase().includes(filter.toLowerCase())
  );
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      
      <input
        type="text"
        placeholder="Search users..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg mb-4"
      />
      
      <div className="space-y-2">
        {filteredUsers.map(user => (
          <div key={user.id} className="p-4 border rounded-lg">
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {user.role}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={pagination.previousPage}
          disabled={pagination.currentPage === 1}
          className="px-4 py-2 border rounded"
        >
          Previous
        </button>
        <span className="px-4 py-2">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        <button
          onClick={pagination.nextPage}
          disabled={pagination.currentPage === pagination.totalPages}
          className="px-4 py-2 border rounded"
        >
          Next
        </button>
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

**Config annotation**:
```yaml
GET:/api/v1/users:
  x-uigen-override:
    id: users.list
    enabled: true
```

### Use Case 3: Analytics Tracking

**Requirement**: Track page views without changing the UI.

**Solution**: UseHooks mode override

```tsx
import { useEffect } from 'react';
import type { OverrideDefinition, OverrideHookProps } from '@uigen-dev/react';

function usePageViewTracking({ resource, operation }: OverrideHookProps) {
  useEffect(() => {
    // Track page view
    const pageData = {
      resource: resource.name,
      operation: operation?.method,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Page view:', pageData);
    
    // Send to analytics service
    if (window.analytics) {
      window.analytics.track('page_view', pageData);
    }
    
    // Update document title
    document.title = `${resource.name} | My App`;
    
    // Cleanup
    return () => {
      console.log('Page view ended:', pageData);
    };
  }, [resource, operation]);
}

const override: OverrideDefinition = {
  targetId: 'users.list',
  useHooks: usePageViewTracking,
};

export default override;
```

**Config annotation**:
```yaml
GET:/api/v1/users:
  x-uigen-override:
    id: users.list
    enabled: true
```

## TypeScript Types Reference

### Core Types

```typescript
// Override definition
interface OverrideDefinition<TData = unknown> {
  targetId: string;
  component?: ComponentType<OverrideComponentProps>;
  render?: (props: OverrideRenderProps<TData>) => ReactNode;
  useHooks?: (props: OverrideHookProps) => Record<string, unknown> | void;
}

// Component mode props
interface OverrideComponentProps {
  resource: Resource;
  operation?: Operation;
}

// Render mode props
interface OverrideRenderProps<TData = unknown> {
  resource: Resource;
  operation?: Operation;
  data: TData | undefined;
  isLoading: boolean;
  error: Error | null;
}

// UseHooks mode props
interface OverrideHookProps {
  resource: Resource;
  operation?: Operation;
}
```

### View-Specific Types

```typescript
// List view
interface ListRenderProps<TData = any[]> extends OverrideRenderProps<TData> {
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages?: number;
    goToPage: (page: number) => void;
    nextPage: () => void;
    previousPage: () => void;
  };
}

// Detail view
interface DetailRenderProps<TData = Record<string, unknown>>
  extends OverrideRenderProps<TData> {
  operation: Operation;
}

// Form view
interface FormRenderProps<TData = Record<string, unknown>>
  extends OverrideRenderProps<TData> {
  operation: Operation;
  mode: 'create' | 'edit';
  formMethods: {
    register: any;
    handleSubmit: any;
    errors: Record<string, any>;
    isSubmitting: boolean;
  };
}
```

## Best Practices

### 1. One Override Per File

```tsx
// ✅ Good: One override per file
const override: OverrideDefinition = {
  targetId: 'users.list',
  component: UsersListComponent,
};

export default override;

// ❌ Bad: Multiple overrides in one file
export const override1 = { ... };
export const override2 = { ... };
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

// ❌ Bad: No types
const override: OverrideDefinition = {
  targetId: 'users.detail',
  render: (props) => {
    return <div>{props.data.name}</div>; // No type safety
  },
};
```

### 3. Handle All States

```tsx
// ✅ Good: Handle loading, error, and empty states
function renderUser(props: DetailRenderProps<User>) {
  if (props.isLoading) return <LoadingSpinner />;
  if (props.error) return <ErrorMessage error={props.error} />;
  if (!props.data) return <NotFound />;
  
  return <UserDetails user={props.data} />;
}

// ❌ Bad: Only handle success state
function renderUser(props: DetailRenderProps<User>) {
  return <UserDetails user={props.data} />; // Crashes if data is null
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

### 5. Match Target IDs Correctly

```yaml
# Config annotation
GET:/api/v1/users:
  x-uigen-override:
    id: users.list  # Must match targetId in override file
```

```tsx
// Override file
const override: OverrideDefinition = {
  targetId: 'users.list',  // Must match id in config
  component: UsersListComponent,
};
```

## Troubleshooting

### Override Not Working

**Symptoms**: Override file exists but default view still renders.

**Checklist**:
1. ✅ Check `x-uigen-override` annotation exists in `.uigen/config.yaml`
2. ✅ Check `enabled: true` (or omit for default true)
3. ✅ Check `targetId` in override file matches `id` in annotation
4. ✅ Check file is in `src/overrides/` directory
5. ✅ Check file has `export default override`
6. ✅ Check console for error messages
7. ✅ Restart `uigen serve` if needed

**Example debugging**:
```bash
# Run with verbose logging
uigen serve openapi.yaml --verbose

# Check console output for:
# - "Discovered override files: ..."
# - "Transpiling overrides..."
# - "Override registered: ..."
```

### TypeScript Errors

**Symptoms**: Type errors in override files.

**Solutions**:
1. Install types: `npm install @uigen-dev/react`
2. Check imports: `import type { ... } from '@uigen-dev/react'`
3. Check tsconfig.json: `"jsx": "react-jsx"`

### Override Not Hot Reloading

**Symptoms**: Changes to override file don't appear without full reload.

**Solutions**:
1. Save the file (ensure file watcher is working)
2. Check browser console for errors
3. Restart `uigen serve` if needed
4. Clear browser cache

### Data Not Loading in Render Mode

**Symptoms**: `props.data` is always undefined in render mode.

**Solutions**:
1. Check API endpoint is correct
2. Check authentication is working
3. Check network tab for failed requests
4. Use component mode for custom data fetching

## Testing Overrides

### Manual Testing

1. Start dev server: `uigen serve openapi.yaml`
2. Navigate to the view in browser
3. Verify override is applied
4. Test all states (loading, error, success, empty)
5. Test interactions (buttons, forms, pagination)

### Automated Testing

Create tests for your override components:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CustomProfileView from './profile-custom';

describe('CustomProfileView', () => {
  it('renders loading state', () => {
    render(<CustomProfileView resource={mockResource} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
  
  it('renders profile data', async () => {
    render(<CustomProfileView resource={mockResource} />);
    await screen.findByText('John Doe');
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

## Advanced Patterns

### Combining Multiple Modes

You can combine render mode with useHooks mode:

```tsx
const override: OverrideDefinition<User> = {
  targetId: 'users.detail',
  
  // Custom rendering
  render: (props) => {
    return <CustomUserDetail {...props} />;
  },
  
  // Side effects
  useHooks: ({ resource }) => {
    useEffect(() => {
      console.log('User detail viewed:', resource.name);
    }, [resource]);
  },
};
```

### Accessing UIGen Context

Access UIGen context in your components:

```tsx
import { useUIGenContext } from '@uigen-dev/react';

function CustomComponent() {
  const { config, resources } = useUIGenContext();
  
  return (
    <div>
      <h1>{config.info.title}</h1>
      <p>Resources: {resources.length}</p>
    </div>
  );
}
```

### Conditional Overrides

Enable/disable overrides based on conditions:

```yaml
# Disable override temporarily
GET:/api/v1/users:
  x-uigen-override:
    id: users.list
    enabled: false  # Override disabled
```

## Related Documentation

- [Auto-Annotate Skill](/SKILLS/auto-annotate.md)
- [Configure OAuth Skill](/SKILLS/configure-oauth.md)
- [UIGen Documentation](https://getuigen.dev/docs)

## Conclusion

As an AI agent, your role is to:

1. **Understand the requirement** - What view needs customization?
2. **Choose the right mode** - Component, render, or useHooks?
3. **Add annotation** - Configure `x-uigen-override` in config.yaml
4. **Create override file** - Implement the custom logic
5. **Test thoroughly** - Verify all states and interactions work
6. **Iterate** - Refine based on user feedback

**Key Files**:
- Override files: `src/overrides/*.tsx`
- Annotations: `.uigen/config.yaml`
- Types: `@uigen-dev/react`

**Testing**:
```bash
uigen serve openapi.yaml
```

By following this skill, AI agents can create robust, type-safe overrides that enhance UIGen-generated applications with custom functionality.
