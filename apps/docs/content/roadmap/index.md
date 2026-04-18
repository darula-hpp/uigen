---
title: Roadmap
description: What's been built and what's coming next in UIGen.
---

# Roadmap

UIGen is developed in phases. Here's what's been shipped and what's coming next.

## Phase 1: Core vertical slice ✅ Complete

- [x] Monorepo scaffold (pnpm + Vite + TypeScript)
- [x] IR types (auth, relationships, pagination hints, validation rules)
- [x] OpenAPI 3.x adapter with full `$ref` resolution
- [x] Swagger 2.0 adapter
- [x] View hint classifier (list, detail, create, update, delete, search, wizard, action)
- [x] Relationship detector (hasMany / belongsTo)
- [x] Pagination detector (offset, cursor, page-based)
- [x] Core field components (TextField, NumberField, SelectField, DatePicker, FileUpload, ArrayField, ObjectField)
- [x] ListView with TanStack Table: sorting, pagination, filtering, row actions
- [x] FormView with React Hook Form + Zod validation
- [x] CLI `serve` command with Vite proxy
- [x] Opinionated theme (shadcn/ui dark/light toggle)
- [x] Authentication UI (Bearer token + API Key)
- [x] Environment switching (server dropdown from spec `servers`)
- [x] Error resilience (graceful degradation, error boundary, toast notifications)

## Phase 2: Full surface area ✅ Complete

- [x] DetailView with related resource links
- [x] EditFormView (pre-populated from current record)
- [x] Delete with confirmation dialog
- [x] Custom action buttons (non-CRUD operations)
- [x] SearchView (global + per-resource filters)
- [x] DashboardView (auto-generated overview with resource counts)
- [x] WizardView (multi-step for large forms)
- [x] Sidebar layout + TopBar + Breadcrumbs + responsive shell
- [x] React Router with full URL navigation and browser history
- [x] Config reconciliation system (runtime annotation merging from `.uigen/config.yaml`)

## Phase 3: Extension & distribution 🔜 In progress

- [ ] `x-uigen-*` vendor extension support (widget, label, hidden, order, view)
- [ ] `uigen.config.json`: theme/behaviour/resource overrides
- [ ] `uigen validate`: spec linting with actionable errors and line numbers
- [ ] `uigen generate`: static production build output
- [ ] OAuth2 PKCE authentication flow
- [ ] Spec hot-reloading (file watcher → WebSocket push to UI)
- [ ] Loading skeletons with shimmer animation
- [ ] Virtual scrolling for large datasets (TanStack Virtual)
- [ ] Request / response interceptors (config-driven middleware)
- [ ] Response transformation (JSONPath + JS functions)
- [ ] Publish all packages to npm (`@uigen-dev/core`, `@uigen-dev/react`, `@uigen-dev/cli`)

## Phase 4: Renderer ecosystem

- [ ] `@uigen-dev/svelte`: Svelte renderer consuming the same IR
- [ ] `@uigen-dev/vue`: Vue 3 renderer
- [ ] Plugin API: register custom adapters, field types, and view strategies as npm packages
- [ ] `uigen ui:config`: visual configuration dashboard
- [ ] `@uigen-dev/plugin-charts`: chart widgets from numeric data
- [ ] `@uigen-dev/plugin-mapbox`: map renderer for geo coordinate fields
- [ ] GraphQL adapter
- [ ] OpenAPI 3.1 full support
