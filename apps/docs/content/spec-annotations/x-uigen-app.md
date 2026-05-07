---
title: x-uigen-app
description: Configure application-level metadata such as name and icon for your UIGen application.
---

# x-uigen-app

The `x-uigen-app` annotation enables configuration of application-level metadata for UIGen applications. This annotation provides a declarative way to configure app-wide settings such as application name and icon that apply globally to the generated application.

## Purpose

Use `x-uigen-app` when:

- You want to customize the application name displayed in the browser tab and header
- You want to set a custom favicon and header icon for branding
- You want to override the default application name derived from the OpenAPI spec title
- You need to configure app-level metadata separately from the OpenAPI info section

**Note:** This annotation handles general app configuration only. Colors, themes, and styling are handled separately through `.uigen/theme.css`.

## How it works

When `x-uigen-app` is present at the document level, UIGen:

1. Extracts the app configuration and stores it in the IR
2. Uses the configured name for the browser document title and application header
3. Uses the configured icon as the favicon and displays it in the header
4. Falls back to OpenAPI spec defaults when fields are not provided

The annotation is entirely optional. Without it, UIGen uses the OpenAPI `info.title` as the application name and no custom icon.

## Supported values

`x-uigen-app` accepts an **object** with the following optional fields:

| Field | Type | Description | Default |
|---|---|---|---|
| `name` | string | Custom application name (overrides OpenAPI title) | OpenAPI `info.title` |
| `icon` | string | Application icon URL or path (used for favicon and header) | None |

All fields are optional. Unknown fields are preserved for forward compatibility.

## Supported locations

`x-uigen-app` is a **document-level annotation only**. It can be applied:

| Location | Effect |
|---|---|
| Document root (OpenAPI spec root) | Configures app-level metadata globally |
| Config file (`.uigen/config.yaml`) | Configures app-level metadata via config |

The annotation cannot be applied at operation, path, or field levels. If applied at the wrong level, a warning is logged and the annotation is ignored.

## OpenAPI 3.x examples

### Minimal example

Configure only the application name:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

x-uigen-app:
  name: "My Application"

paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Success
```

Result: Browser tab shows "My Application", header shows "My Application", no custom icon.

### Complete example

Configure both name and icon:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

x-uigen-app:
  name: "My Application"
  icon: "/.uigen/assets/logo.svg"

paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Success
```

Result: Browser tab shows "My Application", header shows "My Application" with logo, favicon is logo.svg.

### Icon only

Configure only the icon, use OpenAPI title for name:

```yaml
openapi: 3.0.0
info:
  title: My Application
  version: 1.0.0

x-uigen-app:
  icon: "/.uigen/assets/logo.svg"

paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Success
```

Result: Browser tab shows "My Application" (from info.title), header shows "My Application" with logo, favicon is logo.svg.

### External icon URL

Use an external CDN URL for the icon:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

x-uigen-app:
  name: "My Application"
  icon: "https://cdn.example.com/logo.svg"

paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Success
```

Result: Icon is loaded from the CDN URL.

### Empty annotation

All fields are optional, so an empty object is valid:

```yaml
openapi: 3.0.0
info:
  title: My Application
  version: 1.0.0

x-uigen-app: {}

paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Success
```

Result: Uses OpenAPI defaults (info.title for name, no icon).

## Config file examples

### Basic config file usage

Define app configuration in `.uigen/config.yaml`:

```yaml
# .uigen/config.yaml
annotations:
  x-uigen-app:
    name: "My Application"
    icon: "/.uigen/assets/logo.svg"
```

This applies the app configuration without modifying the OpenAPI spec.

### Precedence: spec overrides config

When the annotation exists in both the spec and config file, the spec value takes precedence:

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

x-uigen-app:
  name: "Production App"
  # This takes precedence

# .uigen/config.yaml
annotations:
  x-uigen-app:
    name: "Development App"
    # This is ignored
```

Result: Application name is "Production App".

### Config-only configuration

If the annotation only exists in the config file, it is applied:

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
# No x-uigen-app annotation

# .uigen/config.yaml
annotations:
  x-uigen-app:
    name: "My Application"
    icon: "/.uigen/assets/logo.svg"
```

Result: Application name is "My Application", icon is logo.svg.

## Assets directory structure

When you run `uigen init`, a default assets directory is created:

```
project-root/
  ├── .uigen/
  │   ├── assets/
  │   │   └── logo.svg          # Default placeholder icon
  │   ├── config.yaml
  │   ├── theme.css
  │   └── base-styles.css
  └── openapi.yaml
```

### Using local assets

To use a local icon:

1. Replace `.uigen/assets/logo.svg` with your custom icon
2. Reference it in the spec using an absolute path:

```yaml
x-uigen-app:
  name: "My Application"
  icon: "/.uigen/assets/logo.svg"
```

The icon is served as a static asset during development and included in the production build.

### Asset path formats

UIGen supports multiple icon path formats:

| Format | Example | Use case |
|---|---|---|
| Absolute path | `/.uigen/assets/logo.svg` | Local assets (recommended) |
| Relative path | `.uigen/assets/logo.svg` | Local assets (also works) |
| External URL | `https://cdn.example.com/logo.svg` | CDN-hosted assets |

## Relationship with OpenAPI info section

The `x-uigen-app` annotation complements the OpenAPI `info` section:

### OpenAPI info section

```yaml
info:
  title: My API              # Used as default app name
  version: 1.0.0             # Not used by x-uigen-app
  description: API docs      # Not used by x-uigen-app
```

### x-uigen-app annotation

```yaml
x-uigen-app:
  name: "My Application"     # Overrides info.title for UI
  icon: "/logo.svg"          # No equivalent in OpenAPI spec
```

**Key differences:**

- `info.title` is the API name (technical)
- `x-uigen-app.name` is the application name (user-facing)
- `info.title` is used as fallback when `x-uigen-app.name` is not provided
- `x-uigen-app.icon` has no equivalent in the OpenAPI spec

## Separation from styling

The `x-uigen-app` annotation handles **metadata only**, not styling:

### App metadata (x-uigen-app)

```yaml
x-uigen-app:
  name: "My Application"
  icon: "/.uigen/assets/logo.svg"
```

### Styling (theme.css)

```css
/* .uigen/theme.css */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
}

.topbar-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
}

.topbar-title {
  font-size: 1.25rem;
  font-weight: 600;
}
```

**Rule:** Use `x-uigen-app` for name and icon, use `.uigen/theme.css` for colors, fonts, and visual styling.

## Validation rules

UIGen validates `x-uigen-app` and provides feedback for invalid configurations:

### Valid configurations

```yaml
# All fields optional
x-uigen-app: {}

# Name only
x-uigen-app:
  name: "My Application"

# Icon only
x-uigen-app:
  icon: "/logo.svg"

# Both fields
x-uigen-app:
  name: "My Application"
  icon: "/logo.svg"

# Unknown fields preserved (forward compatibility)
x-uigen-app:
  name: "My Application"
  icon: "/logo.svg"
  customField: "value"  # Logged as info, preserved
```

### Invalid configurations

```yaml
# Invalid: Not an object
x-uigen-app: true
# Warning: x-uigen-app at document must be a plain object, found boolean

# Invalid: Empty name
x-uigen-app:
  name: ""
# Warning: x-uigen-app: name must be a non-empty string

# Invalid: Wrong type for name
x-uigen-app:
  name: 123
# Warning: x-uigen-app: name must be a non-empty string, found number

# Invalid: Empty icon
x-uigen-app:
  icon: ""
# Warning: x-uigen-app: icon must be a non-empty string

# Invalid: Wrong type for icon
x-uigen-app:
  icon: true
# Warning: x-uigen-app: icon must be a non-empty string, found boolean

# Warning: Color fields not supported
x-uigen-app:
  name: "My App"
  primaryColor: "#007bff"
# Warning: x-uigen-app: primaryColor field is not supported. Use .uigen/theme.css for styling
```

### Error handling

UIGen handles validation errors gracefully:

- **Invalid annotation type**: Logs warning, skips processing, uses OpenAPI defaults
- **Invalid field types**: Logs warning, ignores invalid field, processes valid fields
- **Empty strings**: Logs warning, ignores field, uses default
- **Unknown fields**: Logs info message, preserves field for forward compatibility
- **Color/theme fields**: Logs warning directing to theme.css, ignores field

No exceptions are thrown. The application continues with defaults.

## Context validation

The annotation must be applied at the document level:

### Valid: Document level

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

x-uigen-app:
  name: "My Application"
  # Valid: Applied at document root

paths:
  /users:
    get:
      summary: List users
```

### Invalid: Operation level

```yaml
paths:
  /users:
    get:
      summary: List users
      x-uigen-app:
        name: "My Application"
        # Invalid: Cannot be applied at operation level
        # Warning: x-uigen-app at /paths/users/get: can only be applied at document level
```

### Invalid: Field level

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
          x-uigen-app:
            name: "My Application"
            # Invalid: Cannot be applied at field level
            # Warning: x-uigen-app at field level: can only be applied at document level
```

## Multiple annotations

If multiple `x-uigen-app` annotations exist at the document level, the first one is used:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

x-uigen-app:
  name: "First Application"
  # This is used

x-uigen-app:
  name: "Second Application"
  # This is ignored
  # Warning: Multiple x-uigen-app annotations found at document level. Using first.
```

## React component integration

The configured app metadata is applied in multiple places:

### Document title

The browser tab title is set from `appConfig.name` or falls back to `config.meta.title`:

```typescript
// In App.tsx
useEffect(() => {
  const appName = config.appConfig?.name || config.meta.title;
  document.title = appName;
}, [config.appConfig?.name, config.meta.title]);
```

### Favicon

The favicon is set from `appConfig.icon`:

```typescript
// In App.tsx
useEffect(() => {
  if (config.appConfig?.icon) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = config.appConfig.icon;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = config.appConfig.icon;
      document.head.appendChild(newLink);
    }
  }
}, [config.appConfig?.icon]);
```

### Header/TopBar

The application name and icon are displayed in the header:

```typescript
// In TopBar.tsx
const appName = config.appConfig?.name || config.meta.title;
const appIcon = config.appConfig?.icon;

return (
  <header className="topbar">
    <div className="topbar-brand">
      {appIcon && (
        <img src={appIcon} alt={appName} className="topbar-icon" />
      )}
      <span className="topbar-title">{appName}</span>
    </div>
    {/* ... rest of topbar */}
  </header>
);
```

## Default behavior

Without `x-uigen-app`, UIGen uses sensible defaults:

| Field | Default value | Source |
|---|---|---|
| Application name | OpenAPI `info.title` | OpenAPI spec |
| Browser title | OpenAPI `info.title` | OpenAPI spec |
| Favicon | None | Browser default |
| Header icon | None | Not displayed |
| Header title | OpenAPI `info.title` | OpenAPI spec |

The annotation is entirely optional and purely additive.

## Interaction with other annotations

`x-uigen-app` is independent of other annotations and does not affect their behavior:

### With x-uigen-label

Resource and operation labels are independent of app name:

```yaml
x-uigen-app:
  name: "My Application"

paths:
  /users:
    get:
      summary: list_users
      x-uigen-label: User List
      # Operation label is independent of app name
```

### With x-uigen-layout

Layout configuration is independent of app metadata:

```yaml
x-uigen-app:
  name: "My Application"
  icon: "/logo.svg"

x-uigen-layout:
  strategy: sidebar
  # Layout is independent of app metadata
```

### With x-uigen-landing-page

Landing page configuration is independent of app metadata:

```yaml
x-uigen-app:
  name: "My Application"
  icon: "/logo.svg"

x-uigen-landing-page:
  hero:
    title: "Welcome"
    # Landing page content is independent of app name
```

## Use cases

### Basic branding

Set a custom name and icon for your application:

```yaml
openapi: 3.0.0
info:
  title: user-management-api
  version: 1.0.0

x-uigen-app:
  name: "User Management"
  icon: "/.uigen/assets/logo.svg"
```

Result: Professional branding instead of technical API name.

### Multi-environment configuration

Use config files for environment-specific branding:

```yaml
# .uigen/config.dev.yaml
annotations:
  x-uigen-app:
    name: "My App (Development)"
    icon: "/.uigen/assets/logo-dev.svg"

# .uigen/config.prod.yaml
annotations:
  x-uigen-app:
    name: "My App"
    icon: "/.uigen/assets/logo.svg"
```

### White-label applications

Override app metadata without modifying the spec:

```yaml
# openapi.yaml (shared)
openapi: 3.0.0
info:
  title: Generic API
  version: 1.0.0

# .uigen/config.yaml (customer-specific)
annotations:
  x-uigen-app:
    name: "Customer Portal"
    icon: "/.uigen/assets/customer-logo.svg"
```

### CDN-hosted assets

Use external CDN for icon hosting:

```yaml
x-uigen-app:
  name: "My Application"
  icon: "https://cdn.example.com/assets/logo.svg"
```

Result: Icon loaded from CDN, reducing bundle size.

## Troubleshooting

### Icon not displaying

**Problem:** Icon is not visible in the browser or header.

**Solutions:**

1. Check the icon path is correct (absolute path recommended)
2. Verify the icon file exists in `.uigen/assets/`
3. Check browser console for 404 errors
4. Ensure the icon format is supported (SVG, PNG, ICO)
5. Verify the icon URL is accessible (for external URLs)

### Name not updating

**Problem:** Browser title or header still shows OpenAPI title.

**Solutions:**

1. Verify `x-uigen-app` is at document level (not operation/field level)
2. Check for validation warnings in the console
3. Ensure `name` field is a non-empty string
4. Clear browser cache and reload
5. Check config file precedence (spec overrides config)

### Validation warnings

**Problem:** Seeing warnings about invalid configuration.

**Solutions:**

1. Ensure `x-uigen-app` is an object (not string/boolean)
2. Ensure `name` and `icon` are non-empty strings
3. Remove color/theme fields (use theme.css instead)
4. Check for typos in field names
5. Verify annotation is at document level

## Future enhancements

Potential future extensions to `x-uigen-app`:

- **App description**: Meta description for SEO
- **Social media metadata**: Open Graph and Twitter Card tags
- **PWA configuration**: Manifest.json generation
- **Multi-language support**: i18n for app name
- **Multiple icon sizes**: Different icons for different contexts
- **Splash screens**: Loading screen configuration

These enhancements will be added in future versions while maintaining backward compatibility.

## Summary

The `x-uigen-app` annotation provides a simple way to configure application-level metadata:

- **Optional**: All fields are optional, sensible defaults from OpenAPI spec
- **Flexible**: Supports local assets and external URLs
- **Extensible**: Unknown fields preserved for future enhancements
- **Separated**: Metadata only, styling handled by theme.css
- **Validated**: Clear validation errors with graceful fallbacks

Use `x-uigen-app` to brand your UIGen application with a custom name and icon.
