---
title: Config GUI Plugins
description: Extend the UIGen Config GUI with custom functionality using the plugin system.
---

# Config GUI Plugins

The UIGen Config GUI supports a plugin system that allows you to add custom functionality without forking the codebase. This is particularly useful for SaaS-specific features like user authentication, team management, usage tracking, or billing.

## Why Plugins?

The plugin system solves a common problem: how to add proprietary features to an open-source tool without maintaining a fork.

**Without plugins:**
- Fork the repo
- Add your features
- Manually merge upstream changes
- Maintain diverging codebases

**With plugins:**
- Keep OSS and SaaS in the same repo
- Add features as isolated plugins
- Benefit from upstream improvements automatically
- Deploy different editions from the same codebase

## Quick Start

### 1. Create a Plugin

Create `packages/config-gui/src/plugins/saas/my-plugin.tsx`:

```typescript
import type { UIGenPlugin } from '../../types/plugins.js';

export const myPlugin: UIGenPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  onInit: async (context) => {
    console.log('Plugin initialized!');
  },
  
  components: {
    headerActions: () => (
      <button className="px-3 py-1 bg-blue-500 text-white rounded">
        My Action
      </button>
    )
  }
};
```

### 2. Export Your Plugin

Create `packages/config-gui/src/plugins/saas/index.ts`:

```typescript
import { myPlugin } from './my-plugin.js';

export const saasPlugins = [myPlugin];
```

### 3. Run in SaaS Mode

```bash
cd packages/config-gui
VITE_EDITION=saas npm run dev
```

Your plugin is now loaded and the button appears in the header!

## Plugin Capabilities

### Header Actions

Add buttons or controls to the header:

```typescript
components: {
  headerActions: ({ context }) => (
    <div className="flex gap-2">
      <button onClick={() => console.log(context.state.config)}>
        View Config
      </button>
      <UserMenu user={context.user} />
    </div>
  )
}
```

### Custom Tabs

Add new tabs to the main navigation:

```typescript
components: {
  customTabs: [{
    id: 'team',
    label: 'Team',
    icon: UsersIcon,
    component: ({ context }) => (
      <div className="p-6">
        <h2>Team Management</h2>
        <TeamMemberList team={context.team} />
      </div>
    ),
    order: 10 // Lower numbers appear first
  }]
}
```

### API Middleware

Intercept and modify API requests/responses:

```typescript
apiMiddleware: {
  beforeRequest: async (url, options) => {
    const token = await getAuthToken();
    return {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'X-Team-ID': getCurrentTeam().id
      }
    };
  },
  
  afterResponse: async (response) => {
    trackApiCall(response.url, response.status);
    return response;
  },
  
  onError: async (error, url) => {
    if (error.message.includes('401')) {
      redirectToLogin();
      return true; // Handled
    }
    return false; // Let default handler deal with it
  }
}
```

### Lifecycle Hooks

React to application events:

```typescript
{
  onInit: async (context) => {
    // Initialize auth, analytics, etc.
    await initAuth();
    const user = await getCurrentUser();
    (context as any).user = user;
  },
  
  onDestroy: async () => {
    // Cleanup
    removeEventListeners();
    closeConnections();
  },
  
  onConfigLoad: async (config, context) => {
    // Enrich config with metadata
    return {
      ...config,
      teamId: context.team?.id
    };
  },
  
  onConfigSave: async (config, context) => {
    // Add audit metadata
    return {
      ...config,
      lastModifiedBy: context.user?.email,
      lastModifiedAt: new Date().toISOString()
    };
  },
  
  onTabChange: async (tabId, context) => {
    // Track analytics
    trackEvent('tab_changed', { tabId });
  }
}
```

## Real-World Examples

### Authentication Plugin

```typescript
export const authPlugin: UIGenPlugin = {
  name: 'auth',
  version: '1.0.0',
  
  onInit: async (context) => {
    const user = await getCurrentUser();
    (context as any).user = user;
  },
  
  components: {
    headerActions: ({ context }) => (
      <UserMenu 
        user={context.user}
        onLogout={handleLogout}
      />
    )
  },
  
  apiMiddleware: {
    beforeRequest: async (url, options) => {
      const token = await getAuthToken();
      return {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
      };
    }
  }
};
```

### Team Management Plugin

```typescript
export const teamPlugin: UIGenPlugin = {
  name: 'teams',
  version: '1.0.0',
  
  components: {
    headerActions: TeamSwitcher,
    customTabs: [{
      id: 'team',
      label: 'Team',
      component: TeamSettings,
      disabled: (context) => !context.user?.permissions.includes('manage_team')
    }]
  },
  
  onConfigSave: async (config, context) => {
    return {
      ...config,
      teamId: context.team?.id
    };
  }
};
```

### Usage Tracking Plugin

```typescript
export const analyticsPlugin: UIGenPlugin = {
  name: 'analytics',
  version: '1.0.0',
  
  onTabChange: async (tabId, context) => {
    trackEvent('tab_changed', { 
      tabId,
      userId: context.user?.id 
    });
  },
  
  apiMiddleware: {
    afterResponse: async (response) => {
      trackEvent('api_call', {
        url: response.url,
        status: response.status,
        duration: response.headers.get('X-Response-Time')
      });
      return response;
    }
  },
  
  components: {
    customTabs: [{
      id: 'usage',
      label: 'Usage',
      component: UsageMetrics
    }]
  }
};
```

## Plugin Context

Plugins receive a context object with access to app state and actions:

```typescript
interface PluginContext {
  // App state
  state: {
    config: ConfigFile | null;
    annotations: AnnotationMetadata[];
    specPath: string | null;
    specStructure: any | null;
    isLoading: boolean;
    error: string | null;
  };
  
  // App actions
  actions: {
    loadConfig: () => Promise<void>;
    saveConfig: (config: ConfigFile) => Promise<void>;
    setError: (error: string | null) => void;
    clearError: () => void;
  };
  
  // User context (populated by auth plugins)
  user?: {
    id: string;
    email: string;
    permissions: string[];
    subscription?: 'free' | 'pro' | 'enterprise';
  };
  
  // Team context (populated by team plugins)
  team?: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      email: string;
      role: 'owner' | 'admin' | 'member';
    }>;
  };
}
```

## Environment Configuration

Control which plugins load using environment variables:

```bash
# OSS edition (no plugins)
VITE_EDITION=oss npm run dev

# SaaS edition (loads SaaS plugins)
VITE_EDITION=saas npm run dev

# Enterprise edition (loads enterprise plugins)
VITE_EDITION=enterprise npm run dev

# Explicitly enable specific plugins
VITE_ENABLED_PLUGINS=auth,teams npm run dev

# Disable specific plugins
VITE_DISABLED_PLUGINS=telemetry npm run dev
```

Create `.env.local`:

```bash
VITE_EDITION=saas
VITE_ENABLED_PLUGINS=auth,teams,billing
```

## Building for Production

```bash
# OSS build (no plugins)
VITE_EDITION=oss npm run build

# SaaS build (with plugins)
VITE_EDITION=saas npm run build
```

## Directory Structure

```
packages/config-gui/src/plugins/
├── .gitkeep                    # Placeholder
├── example-plugin.ts           # Reference example (committed)
├── saas/                       # SaaS plugins (gitignored)
│   ├── index.ts               # Export all plugins
│   ├── auth-plugin.tsx        # Authentication
│   ├── team-plugin.tsx        # Team management
│   └── billing-plugin.tsx     # Billing
├── enterprise/                 # Enterprise plugins (gitignored)
│   ├── index.ts               # Export all plugins
│   ├── sso-plugin.tsx         # Single sign-on
│   └── audit-plugin.tsx       # Audit logging
└── custom/                     # Custom plugins (gitignored)
```

The `saas/`, `enterprise/`, and `custom/` directories are gitignored (except for `index.ts` stubs), keeping proprietary code separate from the OSS codebase.

## Testing Plugins

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pluginRegistry } from '../lib/plugin-registry';
import { myPlugin } from './my-plugin';

describe('MyPlugin', () => {
  beforeEach(() => {
    pluginRegistry.register(myPlugin);
  });
  
  afterEach(async () => {
    await pluginRegistry.clear();
  });
  
  it('should register successfully', () => {
    expect(pluginRegistry.has('my-plugin')).toBe(true);
  });
  
  it('should add custom tab', () => {
    const tabs = pluginRegistry.getCustomTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe('my-tab');
  });
});
```

## Best Practices

1. **Keep plugins focused** - Each plugin should have a single responsibility
2. **Handle errors gracefully** - Don't crash the app if a plugin fails
3. **Use TypeScript** - Leverage type safety for plugin development
4. **Document your plugins** - Add JSDoc comments and README files
5. **Test thoroughly** - Write unit tests for plugin functionality
6. **Version carefully** - Use semantic versioning for plugin versions
7. **Minimize dependencies** - Keep plugin bundle size small
8. **Respect user privacy** - Only collect necessary data
9. **Be backwards compatible** - Handle config migrations gracefully
10. **Log appropriately** - Use console.log for debugging, not production

## Troubleshooting

### Plugin Not Loading

Check:
- `VITE_EDITION` environment variable is set correctly
- Plugin is exported in `saas/index.ts` or `enterprise/index.ts`
- No TypeScript compilation errors
- Browser console for errors

### Plugin Components Not Rendering

Check:
- Component is properly typed with correct props
- Plugin is registered before app renders
- Component doesn't throw errors during render
- React DevTools for component tree

### API Middleware Not Working

Check:
- Middleware function signatures are correct
- Middleware returns modified options/response
- Middleware doesn't throw errors
- Network tab shows modified requests

## Documentation

For complete plugin system documentation, see:

- `packages/config-gui/PLUGIN_SYSTEM.md` - Complete guide
- `packages/config-gui/PLUGIN_SYSTEM_SUMMARY.md` - Implementation overview
- `packages/config-gui/PLUGIN_SYSTEM_QUICKSTART.md` - 5-minute quick start
- `packages/config-gui/src/plugins/example-plugin.ts` - Working example

## Community Plugins

If you build a plugin for the UIGen Config GUI, open a pull request to add it to this page.

## Support

For questions or issues with the plugin system:

- Open an issue on [GitHub](https://github.com/darula-hpp/uigen/issues)
- Check existing issues for solutions
- Review the example plugin for reference
