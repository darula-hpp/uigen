# Changelog

All notable changes to UIGen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.9] - 2026-04-14

### Changed

**React renderer (`@uigen-dev/react`)**
- Improved dark mode support with @tailwindcss/typography plugin integration
- Enhanced color contrast ratios for WCAG AA compliance (4.5:1 for text, 3:1 for UI elements)
- Added prose styling support for DetailView content areas
- Improved button border visibility in dark mode (#525252 border color)
- Fixed primary button colors in dark mode (blue #3b82f6 background)
- Added explicit utility classes for all theme colors (bg-*, text-*, border-*, ring-*)
- Fixed pagination button width inconsistency (uniform 2.5rem min-width)
- Updated CSS variable structure for better theme customization
- Added code block styling with proper dark mode support

### Fixed
- Dark mode border visibility issues on login and form buttons
- Primary button appearing white/invisible in dark mode
- Pagination number buttons having inconsistent widths
- CSS utility class generation for theme colors in Tailwind v4

---

## [0.1.8] - 2026-04-14

### Initial public release

This is the first release of UIGen — point it at an OpenAPI spec, get a fully functional frontend.

#### Core engine (`@uigen-dev/core`)

- OpenAPI 3.x adapter with full `$ref` resolution, circular reference detection, and graceful degradation
- Swagger 2.0 adapter
- Intermediate Representation (IR) types — resources, operations, auth schemes, relationships, pagination hints, and validation rules
- View hint classifier — detects list, detail, create, update, delete, search, wizard, and action views
- Relationship detector — `hasMany` from nested paths, `belongsTo` from URI parameter fields
- Pagination detector — offset, cursor, and page-based strategies

#### React renderer (`@uigen-dev/react`)

**Views**
- `ListView` — TanStack Table with sorting, pagination, row actions, empty state, and filter row
- `DetailView` — read-only fields, related resource links, edit/delete/custom action buttons
- `FormView` — React Hook Form + Zod validation, all field types, inline errors, loading state
- `EditFormView` — pre-populated from current record, PUT/PATCH on submit
- `SearchView` — filter inputs per query param, result count, clear filters
- `DashboardView` — resource cards with record counts and navigation links
- `WizardView` — multi-step form for large schemas (8+ fields), step validation, back navigation
- `LoginView` — credential input before accessing protected resources

**Field components**
- `TextField` (with `textarea` variant)
- `NumberField` (with min/max enforcement)
- `CheckboxField`
- `SelectField` (enum values, `x-enumNames` support)
- `DatePicker` / `DateTimePicker`
- `FileUpload` (drag-and-drop, progress display)
- `ArrayField` (add/remove items, length validation)
- `ObjectField` (nested fieldsets, collapsible)

**Auth & infrastructure**
- Bearer token authentication — session storage, `Authorization` header injection, logout
- API Key authentication — header and query param injection
- HTTP Basic authentication — username/password, base64 encoded
- Credential-based login — detects login endpoints from spec, posts credentials, extracts token
- Server selector — environment dropdown from spec `servers`
- Delete confirmation dialog
- Custom action buttons for non-CRUD endpoints
- Toast notifications (success / error / warning / info, auto-dismiss)
- Error boundary — component errors contained, app stays running
- Dark / light theme toggle with system preference detection

#### CLI (`@uigen-dev/cli`)

- `uigen serve` — starts dev server with IR injected from spec
- YAML / JSON auto-detection
- Remote spec URL support
- Vite proxy to real API server with CORS handling
- `--port`, `--proxy-base`, `--renderer`, `--verbose` flags
- Pre-built static dist served via lightweight Node.js HTTP proxy — no Vite required at runtime

---

[0.1.9]: https://github.com/darula-hpp/uigen/releases/tag/v0.1.9
[0.1.8]: https://github.com/darula-hpp/uigen/releases/tag/v0.1.8
