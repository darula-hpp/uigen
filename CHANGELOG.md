# Changelog

All notable changes to UIGen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.2.0] - 2026-04-15

### Added

**Core engine (`@uigen-dev/core`)**
- `x-uigen-label` vendor extension support — annotate any schema property with an explicit label string that overrides the auto-humanized key name. Works on object properties at any nesting depth, array `items` schemas, and `$ref` target schemas. Supported in both OpenAPI 3.x and Swagger 2.0.
  ```yaml
  properties:
    account_sid:
      type: string
      x-uigen-label: "Account SID"   # renders as "Account SID" instead of "Account Sid"
    validity_period:
      type: integer
      x-uigen-label: "Validity Period (seconds)"
  ```
- `$ref` label precedence: property-level `x-uigen-label` wins over the `$ref` target's label, which wins over `humanize(key)`.
- Graceful fallback: empty strings, non-string values, and absent annotations all silently fall back to `humanize(key)` — no errors thrown.

**Examples**
- Added `examples/twilio_messaging_v1_labeled.yaml` — the Twilio Messaging API spec with 282 `x-uigen-label` annotations demonstrating real-world usage (e.g. `sid` → `"SID"`, `friendly_name` → `"Display Name"`, `tcr_id` → `"TCR Brand ID"`, `date_created` → `"Created At"`).

### Fixed

- **React error #300 crash when dashboard loads sub-resources** — Fixed crash that occurred when the dashboard tried to fetch record counts for sub-resources (like AlphaSenders) without providing required parent IDs
  - Added defensive checks in `useApiCall` to detect and skip operations with unresolved path parameters
  - Updated `DashboardView` to identify and skip fetching for sub-resources
  - Added warning logs when path parameters are missing to aid debugging
- **Conditional hook calls** — Ensured all React hooks are called unconditionally before early returns in all view components to comply with React's Rules of Hooks

**React renderer (`@uigen-dev/react`)**
- Fixed crash when navigating to search route for resources without search operations. The `useApiCall` hook previously violated React's Rules of Hooks by calling `useQuery` conditionally (early-return when `operation` is undefined, bottom call when defined). Now always calls `useQuery` unconditionally, using `enabled: false` when no operation is provided. This ensures stable hook call order across renders and prevents "Rendered more hooks than during the previous render" errors.

### Tests
- 24 unit tests covering all `x-uigen-label` scenarios (valid labels, fallbacks, nesting, `$ref` precedence, Swagger 2.0 round-trip)
- 9 property-based tests (100 runs each) covering all correctness properties
- 47 integration tests against the real Twilio Messaging spec verifying end-to-end label overrides
- 8 React renderer tests verifying overridden labels appear in `ListView` column headers, filter placeholders, `FormView` `<Label>` elements, and `DetailView` `<dt>` elements
- 9 property-based tests for `useApiCall` hook rules (100 runs each) verifying unconditional hook calls
- 10 integration tests for SearchView crash scenarios (resources with/without search operations, switching between resources)

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

[0.2.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.0
[0.1.9]: https://github.com/darula-hpp/uigen/releases/tag/v0.1.9
[0.1.8]: https://github.com/darula-hpp/uigen/releases/tag/v0.1.8

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
