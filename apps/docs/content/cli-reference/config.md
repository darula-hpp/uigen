---
title: uigen config
description: Visual interface for managing UIGen annotation configurations.
---

# uigen config

The `config` command opens a visual interface for managing UIGen annotations without modifying your spec file. All customizations are saved to a separate `.uigen/config.yaml` file.

## Usage

```bash
uigen config <spec-file> [options]
```

## Arguments

- `<spec-file>` - Path to your OpenAPI/Swagger spec file (required)

## Options

- `--port <number>` - Port for the config GUI server (default: 4401)
- `--no-open` - Do not automatically open the browser

## Examples

```bash
# Start config GUI for an OpenAPI spec
uigen config openapi.yaml

# Use a custom port
uigen config openapi.yaml --port 3000

# Start without opening browser
uigen config openapi.yaml --no-open
```

## What It Does

1. Validates the spec file exists and is readable
2. Starts a local development server with the config GUI
3. Opens your default browser to the GUI interface
4. Provides visual controls for managing annotations
5. Saves changes to `.uigen/config.yaml`

## Config GUI Features

### Annotations Tab

Manage default values for all registered annotations:

- **x-uigen-ignore** - Hide operations, resources, or fields
- **x-uigen-label** - Customize display labels
- **x-uigen-ref** - Define relationships between resources
- **x-uigen-login** - Mark login operations
- **x-uigen-signup** - Mark signup operations
- And more...

### Visual Editor Tab

Apply annotations to specific elements in your spec:

- Browse your spec structure as a tree
- Click any operation, resource, or field
- Configure annotations with visual controls
- See immediate feedback on changes

### Preview Tab

See how your annotations affect the generated UI:

- Live preview of forms, lists, and detail views
- Updates within 500ms of changes
- Uses the same rendering logic as `uigen serve`

### Theme Tab

Customize the appearance of your generated UI:

- Edit CSS variables for colors, spacing, typography
- Live preview of theme changes
- Export theme to `.uigen/theme.css`

### Relationships Tab

Define relationships between resources:

- Visual canvas for drawing relationships
- Drag and drop to position resources
- Connect resources with relationship lines
- Configure relationship types (one-to-many, many-to-many)

## Config File

The config GUI saves to `.uigen/config.yaml`:

```yaml
version: "1.0"
enabled:
  x-uigen-ignore: true
  x-uigen-label: true
defaults:
  x-uigen-ignore: false
annotations:
  "POST:/api/auth/login":
    x-uigen-login: true
    x-uigen-label: "Sign In"
  "GET:/api/users":
    x-uigen-ignore: false
relationships:
  - source: users
    target: posts
    type: one-to-many
```

## Integration with Serve

The `serve` command automatically reads `.uigen/config.yaml`:

```bash
# Config is applied automatically
uigen serve openapi.yaml
```

No additional flags needed. The reconciler merges annotations from the config file with your spec at runtime.

## Extending the Config GUI

The config GUI supports a plugin system for adding custom functionality without forking. This is useful for SaaS-specific features like user management, team collaboration, or usage tracking.

### Plugin System

Plugins can extend the config GUI with:

- **Header Actions** - Add buttons or controls to the header
- **Custom Tabs** - Add new navigation tabs
- **API Middleware** - Intercept requests/responses
- **Lifecycle Hooks** - React to config changes

### Creating a Plugin

Create a plugin in `packages/config-gui/src/plugins/saas/`:

```typescript
import type { UIGenPlugin } from '@uigen-dev/config-gui';

export const myPlugin: UIGenPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  components: {
    headerActions: () => (
      <button>My Action</button>
    ),
    customTabs: [{
      id: 'my-tab',
      label: 'My Tab',
      component: MyTabComponent
    }]
  },
  
  apiMiddleware: {
    beforeRequest: async (url, options) => {
      // Add auth headers
      return {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': 'Bearer TOKEN'
        }
      };
    }
  }
};
```

### Loading Plugins

Set the edition environment variable:

```bash
# OSS edition (no plugins)
VITE_EDITION=oss uigen config openapi.yaml

# SaaS edition (loads SaaS plugins)
VITE_EDITION=saas uigen config openapi.yaml
```

### Plugin Documentation

For detailed plugin documentation, see:

- `packages/config-gui/PLUGIN_SYSTEM.md` - Complete guide
- `packages/config-gui/PLUGIN_SYSTEM_QUICKSTART.md` - Quick start
- `packages/config-gui/src/plugins/example-plugin.ts` - Example

## Performance

The config GUI is optimized for large specs:

- **Virtualization** - Tree view renders only visible elements
- **Debouncing** - Config writes are batched (500ms)
- **Lazy Loading** - Preview renders on-demand

Specs with 100+ operations load in under 2 seconds.

## Accessibility

The config GUI follows WCAG 2.1 AA guidelines:

- Keyboard navigation support
- ARIA labels on all interactive elements
- Focus management
- Screen reader support

## Troubleshooting

### Port Already in Use

```bash
Error: listen EADDRINUSE: address already in use :::4401
```

**Solution:** Use a different port:

```bash
uigen config openapi.yaml --port 4402
```

### Config Not Applied

If changes in the config GUI don't appear in `uigen serve`:

1. Check that `.uigen/config.yaml` exists
2. Restart the `serve` command
3. Check for YAML syntax errors in the config file

### Browser Doesn't Open

If the browser doesn't open automatically:

1. Manually navigate to `http://localhost:4401`
2. Check that port 4401 is not blocked by a firewall
3. Use `--no-open` and open manually

## Related Commands

- [`uigen serve`](/docs/cli-reference/serve) - Start the development server
- [`uigen validate`](/docs/cli-reference/planned-commands#uigen-validate) - Validate spec (planned)

## Learn More

- [Config Reconciliation System](/docs/core-concepts/config-reconciliation)
- [Blog: Introducing the Config Command](/docs/blog/uigen-config-command)
- [Blog: Customizing Your Theme](/docs/blog/customizing-your-theme)
