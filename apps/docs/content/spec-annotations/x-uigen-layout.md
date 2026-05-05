# x-uigen-layout

The `x-uigen-layout` annotation allows you to configure the layout strategy for your UIGen application. You can specify different layouts at the document level (global) or at the operation level (per-resource).

## Overview

UIGen supports multiple layout strategies out of the box:
- **Sidebar Layout**: Traditional sidebar navigation with top bar (default)
- **Centered Layout**: Centered content container (ideal for auth pages)
- **Dashboard Grid**: Responsive grid layout for dashboard widgets

## Syntax

```yaml
x-uigen-layout:
  type: string          # Required: Layout strategy type
  metadata:             # Optional: Layout-specific configuration
    # ... strategy-specific options
```

## Document-Level Configuration

Apply a layout globally to your entire application:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

x-uigen-layout:
  type: sidebar
  metadata:
    sidebarWidth: 280
    sidebarCollapsible: true

paths:
  # ... your endpoints
```

## Operation-Level Configuration

Override the global layout for specific endpoints:

```yaml
paths:
  /auth/login:
    post:
      operationId: login
      x-uigen-layout:
        type: centered
        metadata:
          maxWidth: 400
          showHeader: false
      # ... rest of operation
```

## Layout Types

### Sidebar Layout

The default layout with collapsible sidebar navigation, top bar, and main content area.

**Type**: `sidebar`

**Metadata Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sidebarWidth` | number | 256 | Width of the sidebar in pixels |
| `sidebarCollapsible` | boolean | true | Whether the sidebar can be collapsed |
| `sidebarDefaultCollapsed` | boolean | false | Initial collapsed state |

**Example**:

```yaml
x-uigen-layout:
  type: sidebar
  metadata:
    sidebarWidth: 300
    sidebarCollapsible: true
    sidebarDefaultCollapsed: false
```

**Use Cases**:
- Admin dashboards
- Data management applications
- Multi-resource applications

### Centered Layout

A centered container layout ideal for authentication pages and focused forms.

**Type**: `centered`

**Metadata Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxWidth` | number | 480 | Maximum width of the centered container in pixels |
| `showHeader` | boolean | true | Whether to show the header with app title |
| `verticalCenter` | boolean | true | Whether to vertically center the content |

**Example**:

```yaml
x-uigen-layout:
  type: centered
  metadata:
    maxWidth: 500
    showHeader: true
    verticalCenter: true
```

**Use Cases**:
- Login pages
- Signup forms
- Password reset pages
- Single-focus forms

### Dashboard Grid Layout

A responsive grid layout for displaying multiple widgets or cards.

**Type**: `dashboard-grid`

**Metadata Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | object | See below | Responsive column configuration |
| `columns.mobile` | number | 1 | Number of columns on mobile devices |
| `columns.tablet` | number | 2 | Number of columns on tablet devices |
| `columns.desktop` | number | 3 | Number of columns on desktop devices |
| `gap` | number | 24 | Gap between grid items in pixels |

**Example**:

```yaml
x-uigen-layout:
  type: dashboard-grid
  metadata:
    columns:
      mobile: 1
      tablet: 2
      desktop: 4
    gap: 32
```

**Use Cases**:
- Dashboard views with multiple widgets
- Card-based layouts
- Analytics dashboards
- Monitoring interfaces

## Complete Examples

### Example 1: Admin Application with Sidebar

```yaml
openapi: 3.0.0
info:
  title: Admin Dashboard
  version: 1.0.0

x-uigen-layout:
  type: sidebar
  metadata:
    sidebarWidth: 280
    sidebarCollapsible: true

paths:
  /users:
    get:
      operationId: listUsers
      # Uses global sidebar layout
      
  /auth/login:
    post:
      operationId: login
      x-uigen-layout:
        type: centered
        metadata:
          maxWidth: 400
          showHeader: false
      # Override with centered layout for login
```

### Example 2: Dashboard with Grid Layout

```yaml
openapi: 3.0.0
info:
  title: Analytics Dashboard
  version: 1.0.0

x-uigen-layout:
  type: sidebar

paths:
  /dashboard:
    get:
      operationId: getDashboard
      x-uigen-layout:
        type: dashboard-grid
        metadata:
          columns:
            mobile: 1
            tablet: 2
            desktop: 3
          gap: 24
      # Dashboard uses grid layout
      
  /reports:
    get:
      operationId: listReports
      # Uses global sidebar layout
```

### Example 3: Auth-Focused Application

```yaml
openapi: 3.0.0
info:
  title: Auth Service
  version: 1.0.0

x-uigen-layout:
  type: centered
  metadata:
    maxWidth: 450
    showHeader: true
    verticalCenter: true

paths:
  /auth/login:
    post:
      operationId: login
      # Uses global centered layout
      
  /auth/signup:
    post:
      operationId: signup
      # Uses global centered layout
      
  /auth/reset-password:
    post:
      operationId: resetPassword
      x-uigen-layout:
        metadata:
          maxWidth: 400
      # Override maxWidth only
```

## Layout Precedence

When both document-level and operation-level layouts are specified:

1. **Operation-level** layout takes precedence for that specific resource
2. **Document-level** layout is used as the default for all other resources
3. **Built-in default** (sidebar) is used if no layout is specified

## Responsive Behavior

All layouts are responsive and adapt to different screen sizes:

- **Mobile** (< 768px): Sidebar collapses to overlay, grid uses mobile column count
- **Tablet** (768px - 1024px): Sidebar can be persistent or overlay, grid uses tablet column count
- **Desktop** (> 1024px): Full layout with all features, grid uses desktop column count

## Accessibility

All layouts include:
- Semantic HTML elements (nav, main, header, aside)
- ARIA landmarks for screen readers
- Keyboard navigation support
- Focus management
- Screen reader announcements

## Performance

Layouts are optimized for performance:
- React.memo prevents unnecessary re-renders
- CSS transforms for smooth animations
- CSS variables avoid layout recalculation
- Debounced resize handlers

## User Preferences

Layout preferences are automatically persisted:
- Sidebar collapse state saved to localStorage
- Preferences scoped per application
- Automatic restore on page load

## See Also

- [Layout System Architecture](/docs/core-concepts/layout-system)
- [Custom Layout Strategies](/docs/extending-uigen/custom-layouts)
- [Layout Migration Guide](/docs/getting-started/layout-migration)
