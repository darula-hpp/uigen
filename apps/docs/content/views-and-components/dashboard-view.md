---
title: Dashboard View
description: Auto-generated overview page with resource counts and quick links.
---

# Dashboard View

The Dashboard View is the home page of the generated UI. It is auto-generated from the resources in your spec and provides an at-a-glance overview.

## Features

- **Resource count widgets**: each resource gets a card showing the total record count, fetched from the list endpoint
- **Quick links**: each widget links to the resource's List View
- **Recent activity**: if the spec includes timestamp fields, a recent activity feed is shown
- **Error resilience**: if a count fetch fails, the widget shows a warning rather than crashing

## Widget types

| Widget | Description |
|---|---|
| `resourceCount` | Shows the total number of records for a resource |
| `recentActivity` | Shows recently modified records (requires timestamp fields) |

## Customisation

The dashboard layout is driven by `DashboardConfig` in the IR:

```typescript
interface DashboardConfig {
  enabled: boolean;
  widgets: DashboardWidget[];
}

interface DashboardWidget {
  type: 'resourceCount' | 'recentActivity';
  resourceSlug?: string;
}
```

You can replace the entire Dashboard View using the Override System:

```typescript
overrideRegistry.register({
  id: 'dashboard',
  mode: 'component',
  component: MyCustomDashboard,
});
```
