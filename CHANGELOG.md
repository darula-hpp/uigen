# Changelog

All notable changes to UIGen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.5.1] - 2026-04-22

### Fixed

**Core engine (`@uigen-dev/core`)**
- **Request body schema name extraction** - Fixed annotation system to correctly identify request body fields
  - Added `requestBodySchemaName` field to `Operation` interface in IR
  - Updated `Body_Processor.processRequestBody()` to extract schema names from `$ref` paths
  - Added `extractSchemaNameFromRef()` helper method to parse schema names from OpenAPI references
  - Updated `Operation_Processor` to pass through `requestBodySchemaName` to operations
  - Fixed `SpecParser` to use actual schema names from IR instead of deriving them
  - Annotations like `x-uigen-max-file-size` now work correctly on request body fields
  - Config reconciliation now provides accurate path suggestions for request body fields
  - 62 tests passing (13 for body processor, 49 for operation processor)

**Config GUI (`@uigen-dev/config-gui`)**
- **Ignored operations in relationship canvas** - Operations with `x-uigen-ignore: true` no longer appear in relationship graph
  - Added filtering logic in `App.tsx` to exclude operations with `x-uigen-ignore` annotation from relationship editor
  - Resources with all operations ignored are automatically filtered out from the canvas
  - Prevents visual clutter and confusion from showing ignored endpoints in relationship management
  - 4 unit tests verifying filtering logic for various scenarios

### Tests
- Added comprehensive tests for schema name extraction from `$ref` paths
- Added tests for `requestBodySchemaName` field propagation through IR
- Added tests for filtering ignored operations in relationship canvas
- All existing tests continue to pass

---

## [0.5.0] - 2026-04-20

### Added

**Core engine (`@uigen-dev/core`)**
- **Explicit relationship type selection** - Direct specification of relationship types in configuration
  - Added optional `type` field to `RelationshipConfig` interface (`hasMany`, `belongsTo`, `manyToMany`)
  - Validation system with warnings for missing types, errors for invalid types
  - Adapter uses explicit types when present, falls back to path-based derivation for backward compatibility
  - 27 new unit tests for type validation and derivation
  - 10 property-based tests with 100 iterations each (1,000 test cases total)

**Config GUI (`@uigen-dev/config-gui`)**
- **TypeSelector component** - Visual interface for selecting relationship types
  - Dropdown with icons and descriptions for each type
  - Auto-recommendation based on path pattern
  - Warning display when selected type doesn't match recommendation
  - Help tooltip with detailed type explanations
  - Full keyboard accessibility (Tab, Arrow keys, Enter)
  - 34 comprehensive unit tests
- **Migration system** - One-click migration for existing relationships
  - `MigrationBanner` component with dismissible warning banner
  - Shows count of relationships without explicit types
  - "Migrate Now" button derives and adds types to all relationships
  - Dismissal state persisted to localStorage
  - Migration logic preserves all existing relationship fields
  - 29 unit tests covering all migration scenarios
- **Enhanced relationship visualization**
  - Different arrow styles: single arrow (hasMany/belongsTo), double arrow (manyToMany)
  - Type prefixes in edge labels
  - Color-coded type indicators in relationship list
  - Tooltips showing type descriptions
- **Type derivation helper** - Client-side type inference from path patterns
  - `deriveTypeFromPath()` function with regex pattern matching
  - Handles standard patterns: `/{source}/{id}/{target}` (hasMany), `/{target}/{id}/{source}` (belongsTo)
  - Defaults to hasMany for unrecognized patterns
  - 42 unit tests including edge cases

**Documentation**
- Updated Intermediate Representation docs with Relationship interface and type explanations
- Added "Relationship Configuration" section to Config Reconciliation docs
- Documented explicit vs. derived types with YAML examples
- Added migration tool usage instructions
- Created example config for meeting-minutes app

### Changed
- `RelationshipForm` now includes TypeSelector with auto-recommendation
- `EdgeDetail` panel now supports type editing with "Detect Type" button
- `RelationshipEditor` integrates migration banner when implicit types detected
- All relationship components updated to display and handle explicit types

### Performance
- Type selector rendering: <10ms (target: <10ms) ✅
- Form submission with type: ~50ms (target: <100ms) ✅
- Migration of 100 relationships: ~500ms (target: <2s) ✅
- Edge rendering with arrow styles: no measurable impact ✅
- Config file write: ~200ms (target: <500ms) ✅

### Accessibility
- Full keyboard navigation support for all new components
- ARIA labels and roles properly implemented
- Focus indicators visible on all interactive elements
- Color contrast meets WCAG AA standards
- Screen reader compatible

---

## [0.4.0] - 2026-04-20

### Added

**Core engine (`@uigen-dev/core`)**
- **File metadata annotation handlers** - Config GUI support for file upload restrictions
  - `FileTypesHandler` - validates and applies `x-uigen-file-types` annotation (allowed MIME types)
  - `MaxFileSizeHandler` - validates and applies `x-uigen-max-file-size` annotation (max file size in bytes)
  - Both handlers registered in `AnnotationHandlerRegistry` for automatic processing
  - Validation-only approach - handlers validate annotations while `FileMetadataVisitor` handles extraction
  - 50 unit tests covering extraction, validation, and integration

**Config GUI (`@uigen-dev/config-gui`)**
- **File field detection** - Automatic identification of file upload fields
  - Extended `FieldNode` interface with `format` and `fileMetadata` properties
  - `SpecParser` now captures format and file metadata from schema nodes
  - `isFileField()` utility detects file fields by checking `type === 'file'` OR `format === 'binary'`
  - 10 unit tests covering all field type detection scenarios
- **File size utilities** - Unit conversion and formatting for file sizes
  - `toBytes()` and `fromBytes()` for converting between B, KB, MB, GB
  - `formatBytes()` for human-readable display (e.g., "5.00 MB")
  - `selectDefaultUnit()` for intelligent unit selection based on byte value
  - 30 unit tests including round-trip conversions and integration scenarios
- **FileSizeInput component** - User-friendly file size configuration
  - Number input with decimal support
  - Unit selector dropdown (KB, MB, GB)
  - Automatic conversion between display value and bytes
  - Real-time formatted byte display
  - Comprehensive validation (positive, finite, min/max bounds)
  - Full accessibility support (ARIA labels, error associations)
  - 28 unit tests covering rendering, conversion, validation, and accessibility
- **MIME type options** - Predefined list of common MIME types
  - 60+ MIME types organized into 6 categories (Images, Documents, Video, Audio, Archives, Other)
  - Includes wildcards (`image/*`, `video/*`, `*/*`) with descriptions
  - Ready for MultiSelect component integration
  - 12 unit tests verifying structure and completeness

---

## [0.3.1] - 2026-04-19

### Fixed

**CLI (`@uigen-dev/cli`)**
- Fixed config GUI CSS not loading when running from npm/npx
  - Added static server mode for serving pre-built config-gui dist files
  - Config GUI now properly serves CSS files (`index-C1RXF-Wi.css`) in production
  - Matches the serve command's dual-mode architecture (dev server for monorepo, static server for npm)
  - API middleware now works correctly in both dev and static modes

---

## [0.3.0] - 2026-04-19

### Added

**Core engine (`@uigen-dev/core`)**
- **Config Reconciliation System** - Runtime annotation merging without modifying source specs
  - Non-destructive, idempotent, and deterministic reconciliation of `.uigen/config.yaml` with OpenAPI/Swagger specs
  - Generic annotation handling - all `x-uigen-*` annotations work automatically without hardcoded support
  - Element path resolution for operations (`METHOD:/path`), schema properties (`Schema.property`), and parameters
  - Config precedence - config annotations override spec annotations
  - Null annotation removal - set annotation to `null` to remove it from reconciled spec
  - 20 property-based tests with 100+ iterations each verifying correctness properties
  - Path resolution caching for performance
  - Helpful error messages with Levenshtein distance-based suggestions for invalid paths
- **x-uigen-ref annotation** - Explicit field-to-resource relationship declarations
  - Declare that a field references another resource with full control over resolution and display
  - Specify `resource` (endpoint path), `valueField` (stored value), and `labelField` (display value)
  - Overrides auto-detected relationship heuristics
  - Renders as select/autocomplete widgets in forms
  - Graceful fallback when referenced resource is unavailable
- **Many-to-many relationship detection** - Automatic detection and UI generation for library patterns
  - Detects `/resourceA/{id}/resourceB` patterns where resourceB has standalone CRUD endpoints
  - Marks target resources with `isLibrary: true` flag
  - Supports read-only associations (GET-only endpoints)
  - Handles slug normalization (singular/plural matching)
  - 64 unit tests + 14 E2E tests covering detection, marking, and edge cases
- **Major adapter refactoring** - Decomposed monolithic adapter classes into focused components
  - Extracted `SchemaProcessor` (~400 lines) with Visitor pattern for schema traversal
    - `TypeMappingVisitor` - converts OpenAPI types to IR types
    - `ValidationExtractionVisitor` - extracts validation rules
    - `FileMetadataVisitor` - extracts file upload metadata
    - `ReferenceResolutionVisitor` - resolves $ref references
    - `SchemaNodeFactory` - creates schema nodes with Factory pattern
  - Extracted `ParameterProcessor` (~150 lines) for parameter handling
    - Parameter reference resolution
    - Path-level and operation-level parameter merging
    - Parameter filtering based on x-uigen-ignore
    - Parameter precedence rules (operation-level overrides path-level)
  - Extracted `BodyProcessor` for request/response body processing
  - Extracted `OperationProcessor` for operation construction
  - Extracted `ResourceExtractor` for resource inference from paths
  - Extracted `AuthDetector` for authentication endpoint detection
  - OpenAPI3Adapter reduced from ~1400 lines to ~500 lines
  - All 1,275+ core tests pass with identical IR output

**CLI (`@uigen-dev/cli`)**
- **`uigen config` command** - Launches visual config GUI for managing annotations
  - Opens browser-based GUI at `http://localhost:4401`
  - Provides API middleware with endpoints: `/api/config`, `/api/spec`, `/api/annotations`, `/api/css`
  - Config file auto-loading - `uigen serve` automatically loads and applies `.uigen/config.yaml`
  - CSS customization endpoints - Read/write `.uigen/base-styles.css` and `.uigen/theme.css`
  - Cross-platform browser opening (Windows, macOS, Linux)
  - Port conflict handling with automatic retry

**Config GUI (`@uigen-dev/config-gui`)**
- **New standalone package** - Visual interface for managing x-uigen annotations without editing specs
  - React-based GUI with Vite build system
  - Reads and writes `.uigen/config.yaml` for annotation customization
  - Auto-discovery of registered annotations via AnnotationHandlerRegistry
  - Live preview showing how annotation changes affect generated UI
  - Dark mode support with theme persistence in localStorage
- **Annotation management UI**
  - Toggle switches for x-uigen-ignore on all element types (operations, schemas, properties, parameters, request bodies, responses)
  - Inline text editing for x-uigen-label annotations
  - Visual feedback with dimming for ignored elements
  - Badges showing annotation source (Explicit, Inherited, Override)
  - Precedence panel displaying annotation hierarchy
- **Tree view with virtualization**
  - React-window for efficient rendering of large specs (100+ operations)
  - Expand/collapse sections
  - Show/hide pruned elements toggle
  - Search and filter by element name or path
- **Bulk operations**
  - Multi-select elements (Ctrl+Click, Shift+Click)
  - Bulk actions: "Ignore All", "Include All"
  - Undo/redo stack with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- **Performance optimizations**
  - Debounced config writes (500ms) to avoid excessive disk I/O
  - Memoization to avoid re-rendering unchanged elements
  - Loads specs with 100+ operations in under 2 seconds
- **Accessibility**
  - ARIA labels on all interactive elements
  - ARIA live regions for state change announcements
  - Keyboard navigation (arrow keys, Enter, Space, Escape)
  - Proper heading hierarchy and landmark regions
  - 3:1 minimum contrast ratio for dimmed elements
- **Export functionality**
  - "Export Ignore Summary" generates markdown or JSON
  - Lists all ignored elements grouped by type
  - Timestamped output files

**React renderer (`@uigen-dev/react`)**
- **LibrarySelector component** - Selection UI for many-to-many library resources
  - Search with 300ms debounce
  - Filter inputs for query parameters
  - Paginated list rendering
  - Visual selection feedback
  - "Create New" and "View All" links
  - Empty state with "Clear Filters" action
  - 19 accessibility tests (keyboard navigation, ARIA labels, screen reader announcements)
- **LibraryAssociationManager component** - Manage many-to-many associations in DetailView
  - Fetch and display currently associated resources
  - Add associations via LibrarySelector
  - Remove associations with DELETE requests
  - Read-only mode for GET-only associations
  - Loading states and error handling
- **DetailView enhancements** - Renders LibraryAssociationManager for manyToMany relationships

**Documentation site (`apps/docs`)**
- Added blog post: "Introducing the UIGen Config Command: Visual Annotation Management"
- Added blog post: "Config Reconciliation: Runtime Annotation Merging Without Touching Your Spec"
- Added documentation page: `/docs/spec-annotations/x-uigen-ref`
- Updated architecture documentation with refactoring details

**Examples**
- Added FastAPI Meeting Minutes example app with authentication
- Improved example specs with real-world patterns

### Changed

**Core engine (`@uigen-dev/core`)**
- Improved file type detection with better MIME type handling
- Enhanced x-uigen-ignore annotation processing with better precedence rules
- Refactored adapter architecture for better maintainability and extensibility

**CLI (`@uigen-dev/cli`)**
- Config GUI now uses separate base-styles.css (read-only) and theme.css (editable)
- Improved error messages with actionable suggestions

### Fixed

**Core engine (`@uigen-dev/core`)**
- Fixed circular reference detection in schema processing
- Fixed parameter merging when operation-level parameters override path-level parameters
- Fixed $ref resolution for nested schema references

**React renderer (`@uigen-dev/react`)**
- Fixed duplicate key warnings in array field rendering
- Fixed image upload detection for binary format fields

### Tests
- 1,275+ core tests passing (all existing tests + new refactoring tests)
- 881 React tests passing (excluding 19 pre-existing failures)
- 64 many-to-many relationship tests (unit + integration)
- 14 E2E tests for library pattern
- 19 accessibility tests for LibrarySelector
- 20 property-based tests for config reconciliation (100+ iterations each)

---

## [0.2.4] - 2026-04-16

### Added

**Core engine (`@uigen-dev/core`)**
- File upload support for OpenAPI 3.x and Swagger 2.0 specs
  - Automatic detection of binary format fields (`type: string`, `format: binary`)
  - Swagger 2.0 `type: file` parameters automatically converted to OpenAPI 3.x binary format
  - File metadata extraction: `contentMediaType`, `x-uigen-file-types`, `x-uigen-max-file-size`
  - Multiple file upload detection from array schemas with binary items
  - HTML `accept` attribute generation from allowed MIME types
  - Automatic `multipart/form-data` content type detection for operations with file fields
  ```yaml
  # OpenAPI 3.x example
  requestBody:
    content:
      multipart/form-data:
        schema:
          properties:
            file:
              type: string
              format: binary
              contentMediaType: image/png
              x-uigen-file-types: ["image/png", "image/jpeg"]
              x-uigen-max-file-size: 5242880  # 5MB
  
  # Swagger 2.0 example
  parameters:
    - name: file
      in: formData
      type: file
      required: true
  ```

**React renderer (`@uigen-dev/react`)**
- File upload strategy system with type-aware validation and previews
  - `ImageUploadStrategy` - supports image/*, 5MB max, shows image preview
  - `DocumentUploadStrategy` - supports PDF, Word, text files, 10MB max, shows document icon
  - `VideoUploadStrategy` - supports video/*, 100MB max, shows video icon
  - `GenericUploadStrategy` - fallback for any file type, 10MB max
- Enhanced `FileUpload` component with:
  - Drag-and-drop support with visual feedback
  - File type and size validation with user-friendly error messages
  - Preview components for uploaded files (image thumbnails, document icons, etc.)
  - Multiple file upload support
  - Remove button for each uploaded file
  - Loading state during preview generation
  - Accessibility features (ARIA labels, live regions, keyboard navigation)
- `StrategyRegistry` for managing and extending file upload strategies
- Utility functions: `formatFileSize`, `getFileIcon` (maps MIME types to Lucide React icons)
- File validation utilities with extension-MIME type consistency checks
- Form submission support for `multipart/form-data` with proper File object handling

**React renderer routing**
- Action operations (`viewHint: 'action'`) now properly routed to `ActionSelectionView`
- `ActionSelectionView` enhanced to display both create and action operations
- Resources with only action operations (like file upload endpoints) now show available actions instead of "No operations available"

### Fixed

**Core engine (`@uigen-dev/core`)**
- Swagger 2.0 file type conversion: `type: "file"` in formData parameters now correctly converts to `type: "string"` with `format: "binary"` in OpenAPI 3.x intermediate format

**React renderer (`@uigen-dev/react`)**
- Fixed routing for resources with action operations (e.g., file upload endpoints)
- Fixed `ActionSelectionView` to handle operations with `viewHint: 'action'` in addition to `viewHint: 'create'`

### Tests
- 30 file upload related tests passing (11 OpenAPI3, 7 Swagger2, 10 content type detection, 2 integration)
- Property-based tests for file metadata preservation, binary format detection, and adapter consistency
- Integration tests verifying end-to-end file upload flow from Swagger 2.0 specs

---

## [0.2.3] - 2026-04-16

### Added

**Core engine (`@uigen-dev/core`)**
- `x-uigen-ignore` vendor extension support: annotate operations or entire paths to exclude them from the generated UI. When an operation is marked with `x-uigen-ignore: true`, it is filtered out during IR construction and will not appear in any generated views, sidebar navigation, or dashboard widgets.
  ```yaml
  paths:
    /internal/metrics:
      x-uigen-ignore: true  # Excludes all operations on this path
    /users:
      get:
        x-uigen-ignore: false  # Explicitly include (overrides path-level)
      post:
        x-uigen-ignore: true   # Exclude this specific operation
  ```
- Operation-level annotations override path-level annotations for fine-grained control
- Resources with all operations ignored are automatically excluded from the IR
- Graceful fallback: non-boolean annotation values are treated as absent with a warning
- Supported in both OpenAPI 3.x and Swagger 2.0 specs

**Documentation site (`apps/docs`)**
- Added comprehensive documentation page for `x-uigen-ignore` at `/docs/spec-annotations/x-uigen-ignore`
- Updated spec annotations overview to list `x-uigen-ignore` as available
- Removed `x-uigen-ignore` from planned annotations (now implemented)

### Changed

**Documentation site (`apps/docs`)**
- Removed all em dashes from documentation content and replaced with appropriate punctuation (colons, parentheses, or regular hyphens) for improved readability and consistency with codebase style guidelines

### Tests
- 27 unit tests covering annotation extraction, operation filtering, resource filtering, and Swagger 2.0 support
- 14 property-based tests (100 runs each) verifying all correctness properties including precedence rules, annotation validation, and cross-feature interactions
- 8 integration tests verifying interaction with `x-uigen-login`, relationship detection, and dashboard generation

---

## [0.2.2] - 2026-04-15

### Added

**Documentation site (`apps/docs`)**
- Full multi-page documentation site at `/docs/[section]/[slug]`, statically generated at build time from Markdown files in `apps/docs/content/`
- 36 content pages across 11 sections: Getting Started, Core Concepts, Supported Specs, Views & Components, Authentication, Spec Annotations, Override System, CLI Reference, Extending UIGen, Roadmap, Contributing
- Left navigation sidebar with expand/collapse sections and active link highlighting
- Right table of contents with scroll-spy for h2/h3 headings
- ⌘K / Ctrl+K search dialog backed by a pre-built Fuse.js index (`public/search-index.json`)
- Copy-to-clipboard code blocks with "Copied!" feedback
- Shared `SiteHeader` component used by both the landing page and docs layout — consistent header across the site with `variant="marketing"` and `variant="docs"` props
- "Docs" link added to the landing page header
- Search closes on Escape key or clicking outside the panel

---

## [0.2.1] - 2026-04-15

### Fixed

**React renderer (`@uigen-dev/react`)**
- **Login route collision** — Resources with a slug of `login` (e.g. an API path like `/login`) no longer collide with the reserved `/login` authentication route. Such resources are now filtered out of the resource routing table so the auth page is always reachable.

**Core engine (`@uigen-dev/core`)**
- **`x-uigen-login` respects all HTTP methods** — Previously, `x-uigen-login: true` was only honoured on `POST` operations; annotated `GET`, `PUT`, `PATCH`, and `DELETE` endpoints were silently ignored. The adapter now iterates all HTTP methods when scanning for the annotation, so any operation marked `x-uigen-login: true` is included as a login endpoint regardless of its method. Auto-detection (heuristic, no annotation) continues to apply to `POST` only.

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

- **React error #300 crash when searching resources** — Fixed crash that occurred when the global search feature tried to search across resources with mixed operation types (some with search operations, some without, some with path parameters)
  - Root cause: `ResourceSearchResults` component in `TopBar.tsx` was calling hooks conditionally (early return before `useApiCall` and `useMemo` hooks)
  - Fixed by moving all hook calls before early returns to ensure consistent hook call order across renders
  - Added sub-resource detection to skip operations with unresolved path parameters (e.g., `/v1/Services/{ServiceSid}/AlphaSenders`)
  - Added defensive checks in `useApiCall` to detect and disable queries with unresolved path parameters
  - Updated all view components (`SearchView`, `ListView`, `DetailView`, `FormView`, `DashboardView`) to call hooks unconditionally
  - Added warning logs when path parameters are missing to aid debugging
- **Conditional hook calls** — Ensured all React hooks are called unconditionally before early returns in all view components and TopBar to comply with React's Rules of Hooks

**React renderer (`@uigen-dev/react`)**
- Fixed crash when navigating to search route for resources without search operations. The `useApiCall` hook previously violated React's Rules of Hooks by calling `useQuery` conditionally (early-return when `operation` is undefined, bottom call when defined). Now always calls `useQuery` unconditionally, using `enabled: false` when no operation is provided. This ensures stable hook call order across renders and prevents "Rendered more hooks than during the previous render" errors.

### Tests
- 24 unit tests covering all `x-uigen-label` scenarios (valid labels, fallbacks, nesting, `$ref` precedence, Swagger 2.0 round-trip)
- 9 property-based tests (100 runs each) covering all correctness properties
- 47 integration tests against the real Twilio Messaging spec verifying end-to-end label overrides
- 8 React renderer tests verifying overridden labels appear in `ListView` column headers, filter placeholders, `FormView` `<Label>` elements, and `DetailView` `<dt>` elements
- 9 property-based tests for `useApiCall` hook rules (100 runs each) verifying unconditional hook calls
- 10 integration tests for SearchView crash scenarios (resources with/without search operations, switching between resources)
- 12 conditional hooks detection tests verifying all view components call hooks unconditionally
- 4 TopBar-specific conditional hooks tests verifying ResourceSearchResults handles mixed resource types correctly

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

[0.3.1]: https://github.com/darula-hpp/uigen/releases/tag/v0.3.1
[0.3.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.3.0
[0.2.5]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.5
[0.2.4]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.4
[0.2.3]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.3
[0.2.2]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.2
[0.2.1]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.1
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
